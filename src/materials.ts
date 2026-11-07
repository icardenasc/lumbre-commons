import { Env, Body, fail, uid, Work } from "./model";
import { requireUser, current, originGuard, rate } from "./auth";
const info = (x: unknown, status = 200) =>
  new Response(JSON.stringify(x), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
export async function validateMaterials(env: Env, workId: string, body: Body) {
  for (const id of body.attachments || []) {
    const row = await env.DB.prepare(
      "SELECT id FROM materials WHERE id=? AND work_id=?",
    )
      .bind(id, workId)
      .first();
    if (!row) fail(400, "Un material adjunto no pertenece a este manuscrito.");
  }
}
export async function materialAPI(req: Request, env: Env, workId: string) {
  const user = await requireUser(req, env),
    work = await env.DB.prepare("SELECT * FROM works WHERE id=? AND owner_id=?")
      .bind(workId, user.id)
      .first<Work>();
  if (!work) fail(404, "Manuscrito no encontrado.");
  const w = work!,
    body: Body = JSON.parse(w.body);
  if (req.method === "GET") {
    const items = (
      await env.DB.prepare(
        "SELECT id,filename,mime,size,sha256 FROM materials WHERE work_id=? ORDER BY created_at",
      )
        .bind(workId)
        .all()
    ).results;
    return info({ materials: items, attached: body.attachments || [] });
  }
  originGuard(req, false);
  if (!["draft", "published"].includes(w.status))
    fail(409, "El manuscrito está bloqueado para edición.");
  if (req.method === "DELETE") {
    const url = new URL(req.url),
      id = url.searchParams.get("id");
    if (!id || !(body.attachments || []).includes(id))
      fail(404, "Material no encontrado.");
    body.attachments = body.attachments!.filter((x) => x !== id);
    const result = await env.DB.prepare(
      "UPDATE works SET body=?,draft_revision=draft_revision+1,status='draft',updated_at=datetime('now') WHERE id=? AND draft_revision=? AND status IN ('draft','published')",
    )
      .bind(JSON.stringify(body), workId, w.draft_revision)
      .run();
    if (!result.meta.changes)
      fail(409, "El borrador cambió. Actualiza la página.");
    return info({ ok: true });
  }
  if (req.method !== "POST") fail(405, "Método no permitido.");
  if ((body.attachments || []).length >= 8)
    fail(422, "Puedes adjuntar hasta ocho materiales por versión.");
  await rate(env, "materials-user:" + user.id, 20, 86400);
  await rate(env, "materials-global", 100, 86400);
  let filename = "";
  try {
    filename = decodeURIComponent(req.headers.get("X-File-Name") || "");
  } catch {
    fail(400, "Nombre de archivo inválido.");
  }
  filename = filename.replace(/[\\/\x00-\x1f]/g, "_").slice(0, 140);
  const extension = filename.toLowerCase().split(".").pop();
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    pdf: "application/pdf",
    csv: "text/csv",
    json: "application/json",
    txt: "text/plain",
    md: "text/markdown",
    py: "text/plain",
  };
  if (!extension || !types[extension])
    fail(415, "Formato permitido: PNG, JPG, PDF, CSV, JSON, TXT, MD o PY.");
  const max = 5 * 1024 * 1024;
  if (Number(req.headers.get("Content-Length")) > max)
    fail(413, "El archivo supera 5 MB.");
  const reader = req.body?.getReader();
  if (!reader) fail(400, "Archivo vacío.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader!.cancel();
      fail(413, "El archivo supera 5 MB.");
    }
    chunks.push(value);
  }
  if (!size) fail(400, "Archivo vacío.");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  if (
    extension === "png" &&
    !(bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)
  )
    fail(415, "El contenido no corresponde a una imagen PNG.");
  if (
    ["jpg", "jpeg"].includes(extension!) &&
    !(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
  )
    fail(415, "El contenido no corresponde a una imagen JPEG.");
  if (
    extension === "pdf" &&
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  )
    fail(415, "El contenido no corresponde a un PDF.");
  if (!["png", "jpg", "jpeg", "pdf"].includes(extension!)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail(415, "Los archivos de texto deben usar UTF-8.");
    }
  }
  const id = uid(),
    key = `materials/${workId}/${id}`,
    sha = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  body.attachments = [...(body.attachments || []), id];
  await env.ARTIFACTS.put(key, bytes, {
    httpMetadata: { contentType: types[extension!] },
  });
  try {
    const result = await env.DB.batch([
      env.DB.prepare(
        "UPDATE works SET body=?,draft_revision=draft_revision+1,status='draft',updated_at=datetime('now') WHERE id=? AND draft_revision=? AND status IN ('draft','published')",
      ).bind(JSON.stringify(body), workId, w.draft_revision),
      env.DB.prepare(
        "INSERT INTO materials(id,work_id,owner_id,filename,mime,size,sha256,r2_key) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM works WHERE id=? AND draft_revision=? AND body=?)",
      ).bind(
        id,
        workId,
        user.id,
        filename,
        types[extension!],
        size,
        sha,
        key,
        workId,
        w.draft_revision + 1,
        JSON.stringify(body),
      ),
    ]);
    if (!result[0].meta.changes || !result[1].meta.changes) {
      await env.ARTIFACTS.delete(key);
      fail(409, "El borrador cambió. Actualiza la página.");
    }
  } catch (err) {
    await env.ARTIFACTS.delete(key);
    throw err;
  }
  return info({ id, filename, size, sha256: sha }, 201);
}
export async function serveMaterial(req: Request, env: Env, id: string) {
  const row = await env.DB.prepare(
    "SELECT m.*,w.status FROM materials m JOIN works w ON w.id=m.work_id WHERE m.id=?",
  )
    .bind(id)
    .first<any>();
  if (!row) fail(404, "Material no encontrado.");
  const published =
    row.status !== "withdrawn"
      ? await env.DB.prepare(
          "SELECT v.id FROM versions v,json_each(v.body,'$.attachments') j WHERE v.work_id=? AND j.value=? LIMIT 1",
        )
          .bind(row.work_id, id)
          .first()
      : null;
  if (!published) {
    const u = await current(req, env);
    if (!u || (u.id !== row.owner_id && u.role !== "editor"))
      fail(404, "Material no encontrado.");
  }
  const object = await env.ARTIFACTS.get(row.r2_key);
  if (!object) fail(404, "Material no encontrado.");
  const image = row.mime === "image/png" || row.mime === "image/jpeg";
  return new Response(object!.body, {
    headers: {
      "Content-Type": row.mime,
      "Content-Disposition": `${image ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function attachedMaterials(env: Env, w: Work, b: Body) {
  const ids = b.attachments || [];
  if (!ids.length) return [];
  return (
    await env.DB.prepare(
      `SELECT id,filename,mime,size,sha256 FROM materials WHERE work_id=? AND id IN (${ids.map(() => "?").join(",")})`,
    )
      .bind(w.id, ...ids)
      .all<any>()
  ).results;
}
