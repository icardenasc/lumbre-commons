// Read-only production checks. No manuscript or account is created.
import { readFileSync, writeFileSync } from "node:fs";
const base = JSON.parse(readFileSync("wrangler.json", "utf8")).vars.APP_URL;
const results = [];
async function check(name, path, expected = 200, contains) {
  const r = await fetch(base + path, { redirect: "manual" }),
    text = await r.text();
  const ok = r.status === expected && (!contains || text.includes(contains));
  results.push({ name, path, status: r.status, expected, ok });
  if (!ok) throw Error(name + " failed: " + r.status);
  return { r, text };
}
for (const path of [
  "/",
  "/explore",
  "/problems",
  "/graph",
  "/journal",
  "/principles",
  "/about",
  "/terms",
  "/privacy",
  "/login",
  "/register",
])
  await check("Page " + path, path);
await check("Health", "/api/health", 200, '"ok":true');
const list = await check(
  "Public records",
  "/api/works",
  200,
  "respuestas-academicas-trazables",
);
const nodes = JSON.parse(list.text).works;
if (
  nodes.some(
    (w) => w.title.includes("QA") || w.title.includes("prueba técnica"),
  )
)
  throw Error("QA content found in public records");
await check("Graph", "/api/graph", 200, '"edges"');
await check("Private workspace requires login", "/workspace", 302);
await check("Private API requires login", "/api/mine", 401);
await check("Editor API requires login", "/api/editor", 401);
await check("Robots", "/robots.txt", 200, "Sitemap:");
await check("Sitemap", "/sitemap.xml", 200, "<urlset");
await check("Agent guide", "/llms.txt", 200, "/works/{id}.md");
const id = "protocolo-aportes-conectados";
const article = await check(
  "Article SSR and metadata",
  "/works/" + id,
  200,
  "citation_title",
);
if (!article.text.includes("Declaración de uso de IA"))
  throw Error("AI declaration missing");
for (const ext of ["md", "json", "bib"])
  await check(
    "Export " + ext,
    `/works/${id}.${ext}?v=1`,
    200,
    "Un protocolo mínimo",
  );
const pdf = await fetch(base + `/works/${id}.pdf?v=1`);
const bytes = new Uint8Array(await pdf.arrayBuffer());
const pdfOK =
  pdf.status === 200 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
results.push({
  name: "PDF export",
  path: `/works/${id}.pdf?v=1`,
  status: pdf.status,
  expected: 200,
  ok: pdfOK,
});
if (!pdfOK) throw Error("PDF export failed");
const cross = await fetch(base + "/api/works", {
  method: "POST",
  headers: {
    Origin: "https://invalid.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
results.push({
  name: "Cross-origin mutation rejected",
  path: "/api/works",
  status: cross.status,
  expected: 403,
  ok: cross.status === 403,
});
if (cross.status !== 403) throw Error("Origin gate failed");
await check("Unknown route", "/missing-page-qa", 404);
const report = {
  checked_at: new Date().toISOString(),
  base,
  checks: results.length,
  passed: results.filter((x) => x.ok).length,
  public_records: nodes.length,
  results,
};
if (process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    checks: report.checks,
    passed: report.passed,
    public_records: report.public_records,
  }),
);
