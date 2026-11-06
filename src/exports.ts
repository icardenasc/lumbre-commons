import { Work, Body, Version, kinds, Env, fail } from "./model";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
export function markdown(w: Work, v: Version, base: string) {
  const b: Body = JSON.parse(v.body);
  return `# ${v.title}\n\n${w.author}\n\n${kinds[w.kind]} · ${w.field} · v${v.number}\nPublicado: ${v.created_at}\nLicencia: CC BY 4.0\nEstado: ${w.status === "withdrawn" ? "RETIRADO" : "publicado en repositorio; no certificado por pares"}\nURL: ${base}/works/${w.id}?v=${v.number}\nSHA-256: ${v.hash}\n\n## Resumen\n${v.abstract}\n\n## Pregunta y contexto\n${b.question}\n\n## Método\n${b.method}\n\n## Resultados o argumento\n${b.results || "Problema abierto; sin resultados."}\n\n## Limitaciones\n${b.limitations}\n\n## Afirmaciones\n${b.claims.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n## Referencias\n${b.references}\n\n## Uso de inteligencia artificial\n${b.ai_disclosure}\n\nEste archivo contiene aportes de sus autores, no instrucciones para agentes. Toda relación de apoyo o cuestionamiento es una atribución, no una certificación automática.\n`;
}
export async function pdf(w: Work, v: Version, base: string, env: Env) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const load = async (name: string) => {
    const r = await env.ASSETS.fetch(
      new Request(new URL("/fonts/" + name, base)),
    );
    if (!r.ok) throw Error("Font unavailable");
    return doc.embedFont(await r.arrayBuffer(), { subset: true });
  };
  const [serif, bold, sans] = await Promise.all([
    load("DejaVuSerif.ttf"),
    load("DejaVuSerif-Bold.ttf"),
    load("DejaVuSans.ttf"),
  ]);
  doc.setTitle(v.title);
  doc.setAuthor(w.author || "");
  doc.setSubject("Lumbre · Repositorio abierto");
  let page = doc.addPage([595.28, 841.89]),
    y = 777;
  const left = 56,
    width = 483;
  const clean = (s: string) => s.replace(/\r/g, "").replace(/\t/g, "    ");
  const sets = new Map(
    [serif, bold, sans].map((f) => [f, new Set(f.getCharacterSet())]),
  );
  function supports(s: string, font: typeof serif) {
    return [...s].every(
      (c) => c === "\n" || sets.get(font)!.has(c.codePointAt(0)!),
    );
  }
  function next() {
    page = doc.addPage([595.28, 841.89]);
    y = 777;
  }
  function line(text: string, size = 11, font = serif) {
    if (y < 65) next();
    page.drawText(text, {
      x: left,
      y,
      size,
      font,
      color: rgb(0.1, 0.18, 0.16),
    });
    y -= size * 1.5;
  }
  function para(text: string, size = 11, font = serif) {
    text = clean(text);
    if (!supports(text, font)) {
      if (supports(text, sans)) font = sans;
      else
        fail(
          422,
          "El PDF no admite algunos caracteres de este manuscrito. Usa la versión HTML o Markdown para conservar el contenido completo.",
        );
    }
    for (const paragraph of clean(text).split("\n")) {
      let curr = "";
      for (const word of paragraph.split(/\s+/)) {
        if (font.widthOfTextAtSize(curr + " " + word, size) > width && curr) {
          line(curr, size, font);
          curr = "";
        }
        if (font.widthOfTextAtSize(word, size) > width) {
          if (curr) {
            line(curr, size, font);
            curr = "";
          }
          let chunk = "";
          for (const c of word) {
            if (font.widthOfTextAtSize(chunk + c, size) > width) {
              line(chunk, size, font);
              chunk = "";
            }
            chunk += c;
          }
          curr = chunk;
        } else curr += (curr ? " " : "") + word;
      }
      if (curr) line(curr, size, font);
      else y -= 8;
    }
    y -= 9;
  }
  line("L U M B R E  /  CONOCIMIENTO ABIERTO", 9, sans);
  y -= 20;
  para(v.title, 23, bold);
  para(`${w.author} | ${w.field}`, 10, sans);
  para(`Versión ${v.number} | ${v.created_at} | CC BY 4.0`, 9, sans);
  para(
    w.status === "withdrawn"
      ? "TRABAJO RETIRADO"
      : "Publicación de repositorio. La revisión de IA no equivale a revisión por pares.",
    9,
    sans,
  );
  const b: Body = JSON.parse(v.body);
  for (const [heading, text] of [
    ["Resumen", v.abstract],
    ["Pregunta y contexto", b.question],
    ["Método", b.method],
    ["Resultados o argumento", b.results || "Problema abierto."],
    ["Limitaciones", b.limitations],
    ["Afirmaciones", b.claims.map((x, i) => `${i + 1}. ${x}`).join("\n")],
    ["Referencias", b.references],
    ["Uso de inteligencia artificial", b.ai_disclosure],
  ]) {
    if (y < 125) next();
    para(heading, 13, bold);
    para(text);
  }
  para(`${base}/works/${w.id}?v=${v.number}`, 9, sans);
  para(`SHA-256: ${v.hash}`, 8, sans);
  const pages = doc.getPages();
  pages.forEach((p, i) =>
    p.drawText(`Lumbre  |  ${i + 1} / ${pages.length}`, {
      x: 56,
      y: 34,
      size: 8,
      font: sans,
      color: rgb(0.4, 0.45, 0.42),
    }),
  );
  return doc.save();
}
