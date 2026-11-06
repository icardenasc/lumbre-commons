import { readFileSync } from "node:fs";
const vars = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const base = JSON.parse(readFileSync("wrangler.json", "utf8")).vars.APP_URL;
async function call(path, body, cookie) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  return {
    status: r.status,
    data: d,
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
let r = await call("/api/register", {
  username: vars.OWNER_USERNAME,
  name: "Alejandro",
  password: vars.OWNER_PASSWORD,
});
if (r.status === 409)
  r = await call("/api/login", {
    username: vars.OWNER_USERNAME,
    password: vars.OWNER_PASSWORD,
  });
if (r.status >= 400)
  throw Error("Owner account creation/login failed: " + r.status);
const a = await call(
  "/api/owner-setup",
  { token: vars.OWNER_SETUP_TOKEN },
  r.cookie,
);
if (a.status !== 200 && a.status !== 409)
  throw Error("Owner activation failed: " + a.status);
const check = await fetch(base + "/api/session", {
  headers: { Cookie: r.cookie },
});
const session = await check.json();
if (session.user?.role !== "editor") throw Error("Editor role not verified");
await call("/api/logout", {}, r.cookie);
console.log(
  "Owner account verified as editor; setup session closed. Username: " +
    vars.OWNER_USERNAME +
    ". Password remains only in local .env.",
);
