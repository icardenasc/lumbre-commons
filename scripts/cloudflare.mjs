import fs from "node:fs";
import { spawnSync } from "node:child_process";
const source = process.env.CLOUDFLARE_ENV_SOURCE;
const vars = { ...process.env };
if (source)
  for (const line of fs.readFileSync(source, "utf8").split("\n")) {
    const m = line.match(
      /^\s*(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)\s*=\s*(.*)$/,
    );
    if (m) vars[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
if (!vars.CLOUDFLARE_API_TOKEN || !vars.CLOUDFLARE_ACCOUNT_ID)
  throw Error("Set Cloudflare credentials or CLOUDFLARE_ENV_SOURCE");
if (process.argv[2] === "provision") {
  const base = `https://api.cloudflare.com/client/v4/accounts/${vars.CLOUDFLARE_ACCOUNT_ID}`;
  async function api(path, method = "GET", data) {
    const r = await fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${vars.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const j = await r.json();
    if (!j.success) throw Error(JSON.stringify(j.errors));
    return j.result;
  }
  const dbs = await api("/d1/database?per_page=100");
  let db = dbs.find((x) => x.name === "lumbre-commons");
  if (!db) db = await api("/d1/database", "POST", { name: "lumbre-commons" });
  const buckets = await api("/r2/buckets");
  if (!buckets.buckets.some((x) => x.name === "lumbre-commons-artifacts"))
    await api("/r2/buckets", "POST", { name: "lumbre-commons-artifacts" });
  const config = {
    $schema: "./node_modules/wrangler/config-schema.json",
    name: "lumbre-commons",
    main: "src/worker.ts",
    compatibility_date: "2026-11-01",
    compatibility_flags: ["nodejs_compat"],
    workers_dev: true,
    assets: {
      directory: "./public",
      binding: "ASSETS",
      run_worker_first: true,
    },
    d1_databases: [
      {
        binding: "DB",
        database_name: "lumbre-commons",
        database_id: db.uuid,
        migrations_dir: "migrations",
      },
    ],
    r2_buckets: [
      { binding: "ARTIFACTS", bucket_name: "lumbre-commons-artifacts" },
    ],
    vars: {
      APP_URL: "https://lumbre-commons.ia-cardenas10.workers.dev",
      OPENAI_MODEL: "gpt-6-astra",
      ANTHROPIC_MODEL: "claude-opus-5-5",
      AI_ENABLED: "false",
    },
    observability: { enabled: true },
    limits: { cpu_ms: 30000 },
  };
  fs.writeFileSync("wrangler.json", JSON.stringify(config, null, 2) + "\n");
  console.log("Dedicated D1 and R2 provisioned; wrangler.json written.");
} else {
  const r = spawnSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", ...process.argv.slice(2)],
    { env: vars, stdio: "inherit" },
  );
  process.exit(r.status ?? 1);
}
