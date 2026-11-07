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
  "/authors",
  "/editorial",
  "/manifesto",
  "/reading-list",
  "/terms",
  "/privacy",
  "/login",
  "/register",
])
  await check("Page " + path, path);
await check("Legacy about redirects to journal", "/about", 301);
await check("RSS feed", "/feed.xml", 200, "<rss");
await check(
  "Manuscript guide",
  "/manuscript-template.md",
  200,
  "Guía de manuscrito",
);
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
for (const ext of ["md", "json", "bib", "ris"])
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
for (const lang of ["en", "pt", "fr"]) {
  for (const route of [
    "",
    "/explore",
    "/problems",
    "/journal",
    "/authors",
    "/editorial",
    "/privacy",
    "/login",
    "/register",
  ]) {
    const x = await check(
      `Locale ${lang} ${route || "home"}`,
      "/" + lang + route,
    );
    if (
      x.r.headers.get("content-language") !== lang ||
      !x.text.includes(`lang="${lang}"`)
    )
      throw Error("Incorrect document language");
  }
  await check(
    `Localized manuscript guide ${lang}`,
    `/${lang}/manuscript-template.md`,
  );
  for (const demo of [
    "demo-simpson-mezclas",
    "demo-trazabilidad-ia",
    "demo-simpson-interpretacion",
  ]) {
    const x = await check(
      `Translated article ${lang} ${demo}`,
      `/${lang}/works/${demo}.json`,
    );
    const j = JSON.parse(x.text);
    if (
      j.reading_translation?.language !== lang ||
      j.version.body.language !== "es"
    )
      throw Error("Translation provenance missing");
    await check(
      `Translated reading ${lang} ${demo}`,
      `/${lang}/works/${demo}`,
      200,
      "data-content",
    );
    await check(
      `Translated Markdown ${lang} ${demo}`,
      `/${lang}/works/${demo}.md`,
      200,
      j.reading_translation.title,
    );
  }
}
for (const asset of [
  "simpson-es.svg",
  "simpson-en.svg",
  "simpson-pt.svg",
  "simpson-fr.svg",
  "simpson-data.csv",
  "reproduce_simpson.py",
  "simpson-results.json",
  "traceability-manifest.json",
])
  await check("Research asset " + asset, "/demo/" + asset);
const translatedSearch = await check(
  "Search translated titles",
  "/api/works?q=" + encodeURIComponent("Beyond"),
);
if (
  !JSON.parse(translatedSearch.text).works.some(
    (w) => w.id === "demo-trazabilidad-ia",
  )
)
  throw Error("Multilingual search failed");
const linked = await check(
  "Version-linked demonstration response",
  "/api/works/demo-simpson-mezclas?v=1",
);
if (
  !JSON.parse(linked.text).edges.some(
    (e) =>
      e.source_id === "demo-simpson-interpretacion" && e.target_version === 1,
  )
)
  throw Error("Demo response missing");
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
