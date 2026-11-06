import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
if (!existsSync(".env")) {
  const template = readFileSync(".env.example", "utf8").replace(
    "OWNER_SETUP_TOKEN=",
    "OWNER_SETUP_TOKEN=" + randomBytes(32).toString("hex"),
  );
  writeFileSync(
    ".env",
    template +
      "\nOWNER_USERNAME=alejandro\nOWNER_PASSWORD=" +
      randomBytes(24).toString("base64url") +
      "\n",
    { mode: 0o600 },
  );
}
chmodSync(".env", 0o600);
const vars = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const r = spawnSync(
  process.execPath,
  ["scripts/cloudflare.mjs", "secret", "put", "OWNER_SETUP_TOKEN"],
  { input: vars.OWNER_SETUP_TOKEN, encoding: "utf8", env: process.env },
);
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
console.log(
  "Owner setup secret configured. Initial login stored only in the ignored .env file (0600).",
);
