import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
const works = JSON.parse(readFileSync("content/demo-research.json", "utf8"));
const q = (x) => "'" + String(x).replaceAll("'", "''") + "'";
mkdirSync(".wrangler/demo", { recursive: true });
let sql =
  "INSERT OR IGNORE INTO users(id,username,name,password_hash,salt,role) VALUES('lumbre-demo','lumbre-demo','Lumbre · demostración editorial','disabled','disabled','author');\n";
const manifest = [];
for (const w of works) {
  const original = w.translations.es;
  const b = {
    ...original.body,
    language: "es",
    demo: true,
    ...(w.assets ? { assets: w.assets } : {}),
  };
  const body = JSON.stringify(b);
  const contentHash = createHash("sha256")
    .update(
      JSON.stringify({
        title: original.title,
        abstract: original.abstract,
        kind: w.kind,
        field: w.field,
        body: b,
      }),
    )
    .digest("hex");
  const key = `works/${w.id}/v1-${contentHash}.json`;
  sql += `INSERT OR IGNORE INTO works(id,owner_id,kind,status,title,abstract,field,body,published_version,collection) VALUES(${[w.id, "lumbre-demo", w.kind, "published", original.title, original.abstract, w.field, body].map(q).join(",")},1,'demostracion');\n`;
  sql += `INSERT OR IGNORE INTO versions(id,work_id,number,title,abstract,body,hash,r2_key) VALUES(${q(w.id + "-v1")},${q(w.id)},1,${[original.title, original.abstract, body, contentHash, key].map(q).join(",")});\n`;
  if (b.target_id)
    sql += `INSERT OR IGNORE INTO edges(id,source_id,source_version,target_id,target_version,relation,target_claim) VALUES(${q(w.id + "-edge")},${q(w.id)},1,${q(b.target_id)},1,${q(b.relation)},${q(b.target_claim || "")});\n`;
  for (const lang of ["en", "pt", "fr"]) {
    const t = w.translations[lang],
      translated = JSON.stringify({
        ...t,
        body: {
          ...t.body,
          language: "es",
          demo: true,
          ...(w.assets ? { assets: w.assets } : {}),
        },
      });
    sql += `INSERT OR IGNORE INTO translations(id,work_id,version,content_hash,source_language,target_language,status,provider,payload,translated,progress,total) SELECT ${[w.id + "-" + lang, w.id].map(q).join(",")},1,${q(contentHash)},'es',${q(lang)},'ready','Lumbre · traducción editorial de demostración','{}',${q(translated)},1,1 FROM versions WHERE work_id=${q(w.id)} AND number=1 AND hash=${q(contentHash)};\n`;
  }
  writeFileSync(
    `.wrangler/demo/${w.id}.json`,
    JSON.stringify({
      work: { id: w.id, kind: w.kind, field: w.field, author: w.author },
      version: 1,
      title: original.title,
      abstract: original.abstract,
      body: b,
      hash: contentHash,
    }),
  );
  manifest.push({ id: w.id, key });
}
writeFileSync(".wrangler/demo/seed.sql", sql);
writeFileSync(".wrangler/demo/manifest.json", JSON.stringify(manifest));
console.log(
  `Prepared ${works.length} original demonstrations and ${works.length * 3} labelled reading translations.`,
);
