import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = "http://127.0.0.1:8787";
async function call(path, body, cookie, method = "POST", origin = base) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    status: r.status,
    data,
    cookie: r.headers.get("set-cookie")?.split(";")[0],
    headers: r.headers,
  };
}
const full = {
  title: "Ensayo de trazabilidad y acceso entre usuarios",
  abstract:
    "Este manuscrito de prueba verifica el flujo de versiones y aislamiento de datos de la plataforma.",
  kind: "article",
  field: "Interdisciplinario",
  body: {
    question:
      "Una pregunta de prueba suficientemente detallada para verificar el flujo editorial y la conservación de los documentos sin filtrar información privada.",
    method:
      "Se crea un documento, se publica una primera versión y se comprueba el aislamiento de un borrador posterior mediante dos cuentas independientes de prueba.",
    results:
      "El resultado esperado de esta prueba es que los lectores accedan únicamente a las versiones públicas y que los cambios sin publicar permanezcan privados.",
    limitations:
      "Es una prueba técnica de integración local y no representa un artículo científico ni una revisión por pares.",
    references: "Referencia de prueba: https://example.com/paper",
    claims: ["La versión publicada es inmutable."],
    ai_disclosure:
      "Contenido sintético exclusivamente para pruebas locales del software.",
    funding: "Sin financiación externa. Declaración de prueba.",
    conflicts: "No existen conflictos de interés en esta prueba.",
    ethics: "Datos sintéticos; no participan personas ni animales.",
    data_availability: "Material de prueba: https://example.com/datos",
    license: "CC-BY-4.0",
    consent: true,
    ai_consent: false,
  },
};
test("Flujo editorial, aislamiento, versiones, respuestas y seguridad", async (t) => {
  const run = Date.now().toString(36),
    password = "Local-test-only-password-2026!";
  const a = await call("/api/register", {
    username: "qa_a_" + run,
    name: "QA autor A",
    password,
  });
  assert.equal(a.status, 201, JSON.stringify(a.data));
  const b = await call("/api/register", {
    username: "qa_b_" + run,
    name: "QA autor B",
    password,
  });
  assert.equal(b.status, 201);
  const ca = a.cookie,
    cb = b.cookie;
  execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "lumbre-commons",
      "--local",
      "--command",
      `UPDATE users SET role='editor' WHERE id='${a.data.user.id}'`,
    ],
    { stdio: "pipe" },
  );
  await t.test("sesiones, origen y permisos", async () => {
    assert.equal(
      (await call("/api/mine", undefined, undefined, "GET")).status,
      401,
    );
    assert.equal(
      (await call("/api/works", full, ca, "POST", "https://evil.example"))
        .status,
      403,
    );
    assert.equal((await call("/api/editor", undefined, cb, "GET")).status, 403);
    assert.equal(
      (
        await call("/api/login", {
          username: "qa_a_" + run,
          password: "incorrecta",
        })
      ).status,
      401,
    );
    assert.equal(
      (await call("/api/login", { username: "qa_a_" + run, password })).status,
      200,
    );
  });
  let id;
  await t.test("borrador privado y bloqueo de acceso cruzado", async () => {
    const r = await call("/api/works", full, ca);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    id = r.data.id;
    assert.equal(
      (await call(`/api/works/${id}/draft`, undefined, cb, "GET")).status,
      404,
    );
    assert.equal(
      (await call(`/api/works/${id}`, undefined, undefined, "GET")).status,
      404,
    );
    assert.equal(
      (await call(`/api/works/${id}`, { ...full, revision: 1 }, cb, "PUT"))
        .status,
      404,
    );
    assert.equal(
      (await call(`/api/works/${id}/review`, { provider: "openai" }, ca))
        .status,
      503,
    );
  });
  await t.test("publicación autorizada y copia inmutable", async () => {
    assert.equal((await call(`/api/works/${id}/submit`, {}, ca)).status, 200);
    assert.equal(
      (await call(`/api/works/${id}`, { ...full, revision: 1 }, ca, "PUT"))
        .status,
      409,
    );
    assert.equal(
      (
        await call(
          `/api/works/${id}/publish`,
          {
            revision: 1,
            note: "Verificación local de integridad del flujo editorial.",
          },
          cb,
        )
      ).status,
      403,
    );
    const pub = await call(
      `/api/works/${id}/publish`,
      {
        revision: 1,
        note: "Verificación local de integridad del flujo editorial.",
      },
      ca,
    );
    assert.equal(pub.status, 200, JSON.stringify(pub.data));
    assert.equal(pub.data.version, 1);
  });
  await t.test("borrador v2 y nota privada no se filtran en v1", async () => {
    const upd = {
      ...full,
      body: { ...full.body, funding: "FINANCIACION PRIVADA V2" },
      title: "BORRADOR PRIVADO V2",
      revision: 1,
    };
    assert.equal((await call(`/api/works/${id}`, upd, ca, "PUT")).status, 200);
    assert.equal((await call(`/api/works/${id}/submit`, {}, ca)).status, 200);
    assert.equal(
      (
        await call(
          `/api/works/${id}/return`,
          { note: "NOTA PRIVADA NO DEBE SER PUBLICA para borrador dos." },
          ca,
        )
      ).status,
      200,
    );
    const pub = await call(`/api/works/${id}`, undefined, undefined, "GET");
    assert.equal(pub.data.work.title, full.title);
    assert.equal(pub.data.work.editor_note, null);
    assert.ok(!JSON.stringify(pub.data).includes("BORRADOR PRIVADO"));
    assert.ok(!JSON.stringify(pub.data).includes("NOTA PRIVADA"));
    assert.ok(!JSON.stringify(pub.data).includes("FINANCIACION PRIVADA"));
    assert.equal(JSON.parse(pub.data.work.body).funding, full.body.funding);
  });
  let reply;
  await t.test("respuesta citable a v1 y permiso editorial", async () => {
    const p = structuredClone(full);
    p.kind = "response";
    p.title = "Una respuesta versionada a una afirmación concreta";
    Object.assign(p.body, {
      target_id: id,
      target_version: 1,
      relation: "challenges",
      target_claim: full.body.claims[0],
    });
    const r = await call("/api/works", p, cb);
    assert.equal(r.status, 201);
    reply = r.data.id;
    assert.equal(
      (await call(`/api/works/${reply}/submit`, {}, cb)).status,
      200,
    );
    assert.equal(
      (
        await call(
          `/api/works/${reply}/publish`,
          {
            revision: 1,
            note: "Se verificó el enlace y la atribución de la respuesta.",
          },
          ca,
        )
      ).status,
      200,
    );
    const v1 = await call(`/api/works/${id}?v=1`, undefined, undefined, "GET");
    assert.equal(v1.data.edges.length, 1);
    assert.equal(v1.data.edges[0].target_claim, full.body.claims[0]);
  });
  await t.test("nueva versión no hereda conexiones de v1", async () => {
    assert.equal((await call(`/api/works/${id}/submit`, {}, ca)).status, 200);
    assert.equal(
      (
        await call(
          `/api/works/${id}/publish`,
          {
            revision: 2,
            note: "Publicación de la segunda versión para verificar historial.",
          },
          ca,
        )
      ).status,
      200,
    );
    const v2 = await call(`/api/works/${id}?v=2`, undefined, undefined, "GET");
    assert.equal(v2.data.edges.length, 0);
    assert.equal(v2.data.version.number, 2);
    const v1 = await call(`/api/works/${id}?v=1`, undefined, undefined, "GET");
    assert.equal(v1.data.work.title, full.title);
    assert.equal(v1.data.edges.length, 1);
  });
  await t.test("exportaciones y metadatos públicos", async () => {
    for (const ext of ["md", "json", "bib", "ris"]) {
      const r = await fetch(`${base}/works/${id}.${ext}?v=1`);
      assert.equal(r.status, 200);
      assert.ok((await r.text()).includes(full.title));
    }
    const html = await (await fetch(`${base}/works/${id}?v=1`)).text();
    assert.ok(html.includes("citation_title"));
    assert.ok(html.includes(full.body.funding));
    assert.ok(html.includes(full.body.conflicts));
    const md = await (await fetch(`${base}/works/${id}.md?v=1`)).text();
    assert.ok(md.includes(full.body.data_availability));
    const feed = await (await fetch(`${base}/feed.xml`)).text();
    assert.ok(feed.includes(`<guid isPermaLink="true">`));
    assert.ok(feed.includes(`/works/${reply}?v=1`));
    assert.ok(html.includes("https://example.com/paper"));
    assert.ok(!html.includes('href="https://examp"'));
  });
  await t.test("retiro conserva historia y bloquea reenvío", async () => {
    assert.equal(
      (
        await call(
          `/api/works/${id}/withdraw`,
          {
            note: "Retiro del contenido de prueba por finalizar su verificación.",
          },
          ca,
        )
      ).status,
      200,
    );
    assert.equal((await call(`/api/works/${id}/submit`, {}, ca)).status, 409);
    assert.equal(
      (await call(`/api/works/${id}`, { ...full, revision: 2 }, ca, "PUT"))
        .status,
      409,
    );
    const x = await call(`/api/works/${id}`, undefined, undefined, "GET");
    assert.equal(x.data.work.status, "withdrawn");
    const list = await call("/api/works", undefined, undefined, "GET");
    assert.ok(!list.data.works.some((w) => w.id === id));
  });
  await t.test(
    "redirección de login y rechazo de referencias inexistentes",
    async () => {
      const html = await (
        await fetch(
          base + "/login?next=" + encodeURIComponent("/\\evil.example"),
        )
      ).text();
      assert.ok(html.includes('data-next="/workspace"'));
      const invalid = structuredClone(full);
      invalid.kind = "response";
      invalid.body.target_id = "missing";
      invalid.body.target_version = 1;
      invalid.body.relation = "responds";
      assert.equal((await call("/api/works", invalid, ca)).status, 400);
    },
  );
  await t.test(
    "materiales privados, publicación, historial y retiro",
    async () => {
      const made = await call("/api/works", full, ca);
      assert.equal(made.status, 201);
      const wid = made.data.id;
      const upload = async (name, data, cookie = ca) =>
        fetch(base + `/api/materials/${wid}`, {
          method: "POST",
          headers: {
            Origin: base,
            Cookie: cookie,
            "X-File-Name": encodeURIComponent(name),
          },
          body: data,
        });
      assert.equal((await upload("bad.svg", "<svg/>")).status, 415);
      assert.equal((await upload("data.csv", "x,y\n1,2", cb)).status, 404);
      assert.equal(
        (await upload("too-big.txt", "x".repeat(5 * 1024 * 1024 + 1))).status,
        413,
      );
      const saved = await upload("datos.csv", "x,y\n1,2");
      assert.equal(saved.status, 201, await saved.clone().text());
      const material = await saved.json();
      const list = await call(`/api/materials/${wid}`, undefined, ca, "GET");
      const mid = list.data.attached[0];
      assert.ok(mid);
      assert.equal((await fetch(base + `/materials/${mid}`)).status, 404);
      assert.equal(
        (await fetch(base + `/materials/${mid}`, { headers: { Cookie: cb } }))
          .status,
        404,
      );
      assert.equal(
        await (
          await fetch(base + `/materials/${mid}`, { headers: { Cookie: ca } })
        ).text(),
        "x,y\n1,2",
      );
      assert.equal(
        (
          await call(
            "/api/works",
            { ...full, body: { ...full.body, attachments: [mid] } },
            cb,
          )
        ).status,
        400,
      );
      assert.equal(
        (await call(`/api/works/${wid}/submit`, {}, ca)).status,
        200,
      );
      assert.equal(
        (
          await call(
            `/api/works/${wid}/publish`,
            {
              revision: 2,
              note: "Comprobación local de archivos públicos versionados.",
            },
            ca,
          )
        ).status,
        200,
      );
      assert.equal(
        await (await fetch(base + `/materials/${mid}`)).text(),
        "x,y\n1,2",
      );
      assert.equal(
        (await call(`/api/materials/${wid}?id=${mid}`, undefined, ca, "DELETE"))
          .status,
        200,
      );
      assert.equal((await fetch(base + `/materials/${mid}`)).status, 200);
      assert.equal(
        (await call(`/api/works/${wid}/submit`, {}, ca)).status,
        200,
      );
      assert.equal(
        (
          await call(
            `/api/works/${wid}/publish`,
            {
              revision: 3,
              note: "Nueva versión sin adjunto; la primera conserva sus materiales.",
            },
            ca,
          )
        ).status,
        200,
      );
      assert.equal((await fetch(base + `/materials/${mid}`)).status, 200);
      assert.equal(
        (
          await call(
            `/api/works/${wid}/withdraw`,
            { note: "Fin de prueba de materiales y control de retiro." },
            ca,
          )
        ).status,
        200,
      );
      assert.equal((await fetch(base + `/materials/${mid}`)).status, 404);
    },
  );
  await t.test(
    "cuatro idiomas, exportación traducida y citas originales",
    async () => {
      const demo = "demo-simpson-mezclas";
      for (const lang of ["es", "en", "pt", "fr"]) {
        const prefix = lang === "es" ? "" : "/" + lang;
        const home = await fetch(base + prefix + "/");
        assert.equal(home.status, 200);
        assert.equal(home.headers.get("content-language"), lang);
        const page = await fetch(base + prefix + "/works/" + demo);
        assert.equal(page.status, 200);
        const html = await page.text();
        assert.ok(html.includes('lang="' + lang + '"'));
        const exported = await (
          await fetch(base + prefix + "/works/" + demo + ".json")
        ).json();
        assert.equal(exported.version.body.language, "es");
        if (lang !== "es") {
          assert.equal(exported.reading_translation.language, lang);
          assert.ok(
            html.includes(
              exported.reading_translation.title.replaceAll("&", "&amp;"),
            ),
          );
          const md = await (
            await fetch(base + prefix + "/works/" + demo + ".md")
          ).text();
          assert.ok(md.includes(exported.reading_translation.title));
          assert.ok(md.includes(exported.version.hash));
          const bib = await (
            await fetch(base + prefix + "/works/" + demo + ".bib")
          ).text();
          assert.ok(bib.includes(exported.version.title));
        }
      }
      const r = await call(`/api/works/${demo}/translation?lang=de`, {}, ca);
      assert.equal(r.status, 400);
      const privateId = (await call("/api/works", full, ca)).data.id;
      assert.equal(
        (await call(`/api/works/${privateId}/translation?lang=en`, {}, ca))
          .status,
        404,
      );
    },
  );
  await t.test("logout invalida la sesión", async () => {
    assert.equal((await call("/api/logout", {}, cb)).status, 200);
    assert.equal((await call("/api/mine", undefined, cb, "GET")).status, 401);
  });
});
