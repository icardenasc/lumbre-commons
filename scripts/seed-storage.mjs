import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
for (const item of JSON.parse(
  readFileSync(".wrangler/seed/manifest.json", "utf8"),
)) {
  const r = spawnSync(
    process.execPath,
    [
      "scripts/cloudflare.mjs",
      "r2",
      "object",
      "put",
      "lumbre-commons-artifacts/" + item.key,
      "--file",
      ".wrangler/seed/" + item.id + ".json",
      "--content-type",
      "application/json",
      "--remote",
    ],
    { stdio: "pipe", env: process.env, encoding: "utf8" },
  );
  if (r.status !== 0) throw Error(r.stderr || r.stdout);
  console.log("Archived " + item.id);
}
