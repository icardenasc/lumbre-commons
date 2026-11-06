export interface Env {
  DB: D1Database;
  ARTIFACTS: R2Bucket;
  ASSETS: Fetcher;
  APP_URL: string;
  AI_ENABLED?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  OWNER_SETUP_TOKEN?: string;
}
export interface User {
  id: string;
  username: string;
  name: string;
  role: "author" | "editor";
}
export interface Body {
  question: string;
  method: string;
  results: string;
  limitations: string;
  references: string;
  claims: string[];
  ai_disclosure: string;
  funding?: string;
  conflicts?: string;
  ethics?: string;
  data_availability?: string;
  license: string;
  target_id?: string;
  target_version?: number;
  relation?: string;
  target_claim?: string;
  consent: boolean;
  ai_consent: boolean;
}
export interface Work {
  id: string;
  owner_id: string;
  kind: string;
  status: string;
  title: string;
  abstract: string;
  field: string;
  body: string;
  draft_revision: number;
  published_version: number;
  problem_state: string;
  collection: string | null;
  editor_note: string | null;
  created_at: string;
  updated_at: string;
  author?: string;
  username?: string;
}
export interface Version {
  id: string;
  work_id: string;
  number: number;
  title: string;
  abstract: string;
  body: string;
  hash: string;
  r2_key: string;
  created_at: string;
}
export const kinds: Record<string, string> = {
  article: "Artículo",
  problem: "Problema abierto",
  response: "Respuesta",
  review: "Revisión abierta",
};
export const relations: Record<string, string> = {
  extends: "Complementa",
  challenges: "Cuestiona",
  replicates: "Replica",
  supports: "Aporta evidencia a",
  responds: "Responde a",
  reviews: "Revisa",
  addresses: "Aborda",
};
export const fields = [
  "Derecho y sociedad",
  "Inteligencia artificial",
  "Ciencias de la vida",
  "Ciencias sociales",
  "Ciencias exactas",
  "Interdisciplinario",
];
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (n: number, m: string): never => {
  throw new HttpError(n, m);
};
export function str(x: unknown, max: number) {
  return typeof x === "string" ? x.trim().slice(0, max) : "";
}
export function parseWork(input: any) {
  if (!input || typeof input !== "object") fail(400, "Contenido inválido.");
  const title = str(input.title, 240),
    abstract = str(input.abstract, 3000),
    kind = str(input.kind, 20),
    field = str(input.field, 80),
    b = input.body || {};
  for (const [key, max] of Object.entries({ title: 240, abstract: 3000 })) {
    if (typeof input[key] !== "string" || input[key].length > max)
      fail(
        400,
        `El campo ${key} debe ser texto y no superar ${max} caracteres.`,
      );
  }
  for (const [key, max] of Object.entries({
    question: 8000,
    method: 12000,
    results: 18000,
    limitations: 6000,
    references: 10000,
    ai_disclosure: 2000,
    funding: 3000,
    conflicts: 3000,
    ethics: 3000,
    data_availability: 3000,
  })) {
    if (
      b[key] !== undefined &&
      (typeof b[key] !== "string" || b[key].length > max)
    )
      fail(400, `El campo ${key} supera su límite de ${max} caracteres.`);
  }
  if (
    b.claims !== undefined &&
    (!Array.isArray(b.claims) ||
      b.claims.length > 8 ||
      b.claims.some((x: unknown) => typeof x !== "string" || x.length > 600))
  )
    fail(
      400,
      "Incluye hasta ocho afirmaciones, de máximo 600 caracteres cada una.",
    );
  if (
    !kinds[kind] ||
    !fields.includes(field) ||
    title.length < 8 ||
    abstract.length < 30
  )
    fail(
      400,
      "Completa tipo, disciplina, título (8 caracteres) y resumen (30 caracteres).",
    );
  const body: Body = {
    question: str(b.question, 8000),
    method: str(b.method, 12000),
    results: str(b.results, 18000),
    limitations: str(b.limitations, 6000),
    references: str(b.references, 10000),
    claims: Array.isArray(b.claims)
      ? b.claims
          .slice(0, 8)
          .map((x: unknown) => str(x, 600))
          .filter(Boolean)
      : [],
    ai_disclosure: str(b.ai_disclosure, 2000),
    funding: str(b.funding, 3000),
    conflicts: str(b.conflicts, 3000),
    ethics: str(b.ethics, 3000),
    data_availability: str(b.data_availability, 3000),
    license: "CC-BY-4.0",
    consent: b.consent === true,
    ai_consent: b.ai_consent === true,
  };
  if (b.target_id) {
    body.target_id = str(b.target_id, 80);
    body.target_version = Number(b.target_version);
    body.relation = str(b.relation, 30);
    body.target_claim = str(b.target_claim, 600);
    if (
      !Number.isSafeInteger(body.target_version) ||
      body.target_version! < 1 ||
      !relations[body.relation]
    )
      fail(400, "Elige una relación y una versión válida.");
  }
  if ((kind === "response" || kind === "review") && !body.target_id)
    fail(400, "Las respuestas y revisiones deben enlazar una publicación.");
  return { title, abstract, kind, field, body };
}
export function screening(w: Pick<Work, "kind">, b: Body) {
  const issues: string[] = [];
  if (b.question.length < 80)
    issues.push("Describe la pregunta o contexto con al menos 80 caracteres.");
  if (b.method.length < 80)
    issues.push(
      "Explica el método o criterio de resolución (mínimo 80 caracteres).",
    );
  if (w.kind !== "problem" && b.results.length < 80)
    issues.push("Incluye resultados o argumento (mínimo 80 caracteres).");
  if (b.limitations.length < 40)
    issues.push("Explica los límites del aporte (mínimo 40 caracteres).");
  if (b.references.length < 20)
    issues.push("Incluye referencias verificables.");
  if (!b.ai_disclosure)
    issues.push("Declara cómo usaste IA, o indica que no la usaste.");
  if (!b.consent)
    issues.push("Confirma autoría responsable y publicación bajo CC BY 4.0.");
  return issues;
}
export function escapeHtml(x: unknown) {
  return String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function safeUrl(s: string) {
  try {
    const u = new URL(s);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export const uid = () => crypto.randomUUID();
export async function hash(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function canonical(w: {
  title: string;
  abstract: string;
  kind: string;
  field: string;
  body: string;
}) {
  return JSON.stringify({
    title: w.title,
    abstract: w.abstract,
    kind: w.kind,
    field: w.field,
    body: JSON.parse(w.body),
  });
}
