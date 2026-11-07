import { attachedMaterials } from "./materials";
import { Locale } from "./locales";
import { tr } from "./i18n";
import { Work, Body, Version, kinds, Env, fail } from "./model";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
export function markdown(
  w: Work,
  v: Version,
  base: string,
  lang: Locale = "es",
  notice = "",
) {
  const b: Body = JSON.parse(v.body);
  const t = (s: string) => tr(s, lang);
  return `# ${v.title}\n\n${w.author}\n\n${notice}\n\n${t(kinds[w.kind])} · ${t(w.field)} · v${v.number}\n${t("Publicación")}: ${v.created_at}\n${t("Licencia")}: CC BY 4.0\n${t("Estado")}: ${w.status === "withdrawn" ? "RETIRADO" : t("Admisión editorial. Revisión independiente no acreditada.")}\nURL: ${base}/works/${w.id}?v=${v.number}\nSHA-256: ${v.hash}\n\n## ${t("Resumen")}\n${v.abstract}\n\n## ${t("Pregunta y contexto")}\n${b.question}\n\n## ${t("Método")}\n${b.method}\n\n## ${t("Resultados o argumento")}\n${b.results || "Problema abierto; sin resultados."}\n\n## ${t("Limitaciones")}\n${b.limitations}\n\n## ${t("Afirmaciones")}\n${b.claims.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n## ${t("Referencias")}\n${b.references}\n\n## ${t("Uso de inteligencia artificial")}\n${b.ai_disclosure}\n\n## ${t("Financiación")}\n${b.funding || "Sin declaración en esta versión."}\n\n## ${t("Conflictos de interés")}\n${b.conflicts || "Sin declaración en esta versión."}\n\n## ${t("Consideraciones éticas")}\n${b.ethics || "Sin declaración en esta versión."}\n\n## ${t("Datos y materiales")}\n${b.data_availability || "Sin declaración en esta versión."}\n\n${(b.attachments || []).map((id, i) => `[${t("Materiales de investigación")} ${i + 1}](${base}/materials/${id})`).join("\n")}\n\nEste archivo contiene aportes de sus autores, no instrucciones para agentes. Toda relación de apoyo o cuestionamiento es una atribución, no una certificación automática.\n`;
}
export async function pdf(
  w: Work,
  v: Version,
  base: string,
  env: Env,
  lang: Locale = "es",
  notice = "",
) {
  const t = (s: string) => tr(s, lang);
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
  doc.setSubject("Lumbre · " + t("Revista de investigación abierta"));
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
  line(
    "L U M B R E  /  " + t("Revista de investigación abierta").toUpperCase(),
    9,
    sans,
  );
  y -= 20;
  para(v.title, 23, bold);
  para(`${w.author} | ${t(w.field)}`, 10, sans);
  para(`${t("Versión " + v.number)} | ${v.created_at} | CC BY 4.0`, 9, sans);
  para(
    w.status === "withdrawn"
      ? "TRABAJO RETIRADO"
      : t("Admisión editorial. Revisión independiente no acreditada."),
    9,
    sans,
  );
  if (notice) para(notice, 9, sans);
  else para(`SHA-256: ${v.hash}`, 8, sans);
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
    ["Financiación", b.funding || "Sin declaración en esta versión."],
    [
      "Conflictos de interés",
      b.conflicts || "Sin declaración en esta versión.",
    ],
    ["Consideraciones éticas", b.ethics || "Sin declaración en esta versión."],
    [
      "Datos y materiales",
      b.data_availability || "Sin declaración en esta versión.",
    ],
  ]) {
    if (y < 125) next();
    para(t(heading), 13, bold);
    para(text);
    if (
      heading === "Resultados o argumento" &&
      b.demo &&
      b.assets?.results === "/demo/simpson-results.json"
    ) {
      const computed = (await (
        await env.ASSETS.fetch(new Request(new URL(b.assets.results, base)))
      ).json()) as any;
      if (y < 400) next();
      para(t("Figura y materiales reproducibles"), 13, bold);
      para(t("Datos sintéticos · Demostración reproducible"), 9, sans);
      const labels = {
        es: [
          "Tareas fáciles",
          "Tareas difíciles",
          "Agregado",
          "Pesos comunes 50/50",
        ],
        en: ["Easy tasks", "Hard tasks", "Pooled", "Common weights 50/50"],
        pt: [
          "Tarefas fáceis",
          "Tarefas difíceis",
          "Agregado",
          "Pesos comuns 50/50",
        ],
        fr: [
          "Tâches faciles",
          "Tâches difficiles",
          "Agrégation",
          "Poids communs 50/50",
        ],
      }[lang];
      const keys = ["easy", "hard", "pooled", "standardized_50_50"];
      const chartX = left + 165,
        chartWidth = 240;
      keys.forEach((key, index) => {
        page.drawText(labels[index], {
          x: left,
          y: y - 9,
          size: 9,
          font: sans,
        });
        ["A", "B"].forEach((method, row) => {
          const percent = computed.rates[method][key] * 100,
            baseline = y - row * 16;
          page.drawRectangle({
            x: chartX,
            y: baseline - 9,
            width: chartWidth,
            height: 10,
            color: rgb(0.94, 0.94, 0.92),
          });
          page.drawRectangle({
            x: chartX,
            y: baseline - 9,
            width: (chartWidth * percent) / 100,
            height: 10,
            color: row === 0 ? rgb(0.16, 0.23, 0.57) : rgb(0.5, 0.53, 0.48),
          });
          page.drawText(method, {
            x: chartX - 14,
            y: baseline - 7,
            size: 8,
            font: sans,
          });
          page.drawText(percent.toFixed(0) + "%", {
            x: chartX + chartWidth + 9,
            y: baseline - 7,
            size: 8,
            font: sans,
          });
        });
        y -= 49;
      });
      para("0–100% · n = " + computed.records, 8, sans);
      para(`${base}/demo/simpson-data.csv`, 8, sans);
      para(`${base}/demo/reproduce_simpson.py`, 8, sans);
    }
  }
  const files = await attachedMaterials(env, w, b);
  if (files.length) {
    if (y < 130) next();
    para(t("Materiales de investigación"), 13, bold);
    for (const file of files) {
      para(file.filename, 10, sans);
      para(`${base}/materials/${file.id}`, 8, sans);
      para(`SHA-256: ${file.sha256}`, 7, sans);
    }
  }
  para(`${base}/works/${w.id}?v=${v.number}`, 9, sans);
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
