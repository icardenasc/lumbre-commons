import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const directory =
  process.argv[2] === "demo" ? ".wrangler/demo" : ".wrangler/seed";
for (const item of JSON.parse(
  readFileSync(directory + "/manifest.json", "utf8"),
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
      directory + "/" + item.id + ".json",
      "--content-type",
      "application/json",
      "--remote",
    ],
    { stdio: "pipe", env: process.env, encoding: "utf8" },
  );
  if (r.status !== 0) throw Error(r.stderr || r.stdout);
  console.log("Archived " + item.id);
}
