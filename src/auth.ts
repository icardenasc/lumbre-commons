import { scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import { Env, User, fail, hash, uid } from "./model";
export function passwordHash(password: string, salt: string) {
  return scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 5,
    maxmem: 32 * 1024 * 1024,
  }).toString("hex");
}
export function equals(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function token() {
  return randomBytes(32).toString("hex");
}
export async function rate(
  env: Env,
  key: string,
  max: number,
  seconds: number,
) {
  const now = Math.floor(Date.now() / 1000),
    bucket = Math.floor(now / seconds),
    k = await hash(`${key}:${bucket}`);
  const r = await env.DB.prepare(
    "INSERT INTO limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(k, now + seconds)
    .first<{ count: number }>();
  if ((r?.count || 0) > max)
    fail(429, "Has alcanzado el límite temporal. Intenta más tarde.");
}
export async function current(req: Request, env: Env) {
  const t = req.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)lumbre_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!t) return null;
  return env.DB.prepare(
    "SELECT u.id,u.username,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(await hash(t), Math.floor(Date.now() / 1000))
    .first<User>();
}
export async function requireUser(req: Request, env: Env) {
  const u = await current(req, env);
  if (!u) fail(401, "Inicia sesión para continuar.");
  return u!;
}
export async function session(env: Env, u: User) {
  const t = token();
  await env.DB.prepare(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
  )
    .bind(await hash(t), u.id, Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7)
    .run();
  return t;
}
export function cookie(req: Request, value: string, age = 604800) {
  return `lumbre_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function originGuard(req: Request) {
  const origin = req.headers.get("Origin");
  if (origin !== new URL(req.url).origin)
    fail(403, "Origen de solicitud no permitido.");
  if (!req.headers.get("Content-Type")?.startsWith("application/json"))
    fail(415, "Se requiere application/json.");
}
export async function jsonBody(req: Request) {
  if (Number(req.headers.get("Content-Length") || 0) > 100000)
    fail(413, "El envío supera 100 KB.");
  const reader = req.body?.getReader();
  if (!reader) fail(400, "Falta contenido.");
  let length = 0,
    parts: Uint8Array[] = [];
  while (true) {
    const x = await reader!.read();
    if (x.done) break;
    length += x.value.byteLength;
    if (length > 100000) {
      await reader!.cancel();
      fail(413, "El envío supera 100 KB.");
    }
    parts.push(x.value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(parts)));
  } catch {
    fail(400, "JSON inválido.");
  }
}
