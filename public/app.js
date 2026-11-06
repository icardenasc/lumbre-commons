"use strict";
const $ = (s) => document.querySelector(s);
function notify(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  el.classList.toggle("error", error);
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => (el.hidden = true), 6500);
}
async function api(path, body, method = "POST") {
  const r = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error("El servidor no respondió. Intenta de nuevo.");
  }
  if (!r.ok)
    throw Error([d.error, ...(d.issues || [])].filter(Boolean).join("\n"));
  return d;
}
function bindForm(id, handler) {
  const form = $(id);
  if (!form) return;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const buttons = [...form.querySelectorAll("button")];
    buttons.forEach((b) => (b.disabled = true));
    const err = $("#form-error");
    if (err) err.hidden = true;
    try {
      await handler(new FormData(form), form, ev);
    } catch (e) {
      if (err) {
        err.textContent = e.message;
        err.hidden = false;
        err.scrollIntoView({ block: "center", behavior: "smooth" });
      } else notify(e.message, true);
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  });
}
bindForm("#auth-form", async (f, form) => {
  await api("/api/" + form.dataset.mode, Object.fromEntries(f));
  location.href = form.dataset.next || "/workspace";
});
bindForm("#work-form", async (f, form) => {
  const value = (n) => String(f.get(n) || "");
  const body = {
    question: value("question"),
    method: value("method"),
    results: value("results"),
    limitations: value("limitations"),
    references: value("references"),
    claims: value("claims")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean),
    ai_disclosure: value("ai_disclosure"),
    funding: value("funding"),
    conflicts: value("conflicts"),
    ethics: value("ethics"),
    data_availability: value("data_availability"),
    consent: f.has("consent"),
    ai_consent: f.has("ai_consent"),
  };
  if (f.get("target_id"))
    Object.assign(body, {
      target_id: value("target_id"),
      target_version: Number(f.get("target_version")),
      relation: value("relation"),
      target_claim: value("target_claim"),
    });
  const data = {
    title: value("title"),
    abstract: value("abstract"),
    kind: value("kind"),
    field: value("field"),
    body,
    revision: Number(form.dataset.revision),
  };
  const id = form.dataset.workId;
  const r = await api(
    "/api/works" + (id ? "/" + id : ""),
    data,
    id ? "PUT" : "POST",
  );
  window.onbeforeunload = null;
  location.href = "/workspace/" + (id || r.id);
});
const workForm = $("#work-form");
if (workForm)
  workForm.addEventListener("input", () => {
    window.onbeforeunload = () => true;
  });
bindForm("#decision-form", async (f, form, ev) => {
  const action = ev.submitter.value;
  await api(`/api/works/${form.dataset.id}/${action}`, {
    note: String(f.get("note")),
    collection: f.has("collection"),
    revision: Number(form.dataset.revision),
  });
  location.href =
    action === "publish" ? "/works/" + form.dataset.id : "/editor";
});
bindForm("#collaborate-form", async (f, form) => {
  await api(`/api/works/${form.dataset.id}/collaborate`, {
    contribution: String(f.get("contribution")),
  });
  location.reload();
});
bindForm("#problem-state-form", async (f, form) => {
  await api(
    `/api/works/${form.dataset.id}/problem-state`,
    Object.fromEntries(f),
  );
  location.reload();
});
bindForm("#withdraw-form", async (f, form) => {
  await api(`/api/works/${form.dataset.id}/withdraw`, Object.fromEntries(f));
  location.reload();
});
bindForm("#owner-form", async (f) => {
  await api("/api/owner-setup", Object.fromEntries(f));
  location.href = "/editor";
});
bindForm("#password-form", async (f) => {
  await api("/api/password", Object.fromEntries(f));
  notify("Contraseña actualizada. Las sesiones anteriores se cerraron.");
  $("#password-form").reset();
});
$("#logout")?.addEventListener("click", async () => {
  try {
    await api("/api/logout", {});
    location.href = "/";
  } catch (e) {
    notify(e.message, true);
  }
});
for (const b of document.querySelectorAll("[data-submit]"))
  b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      if (window.onbeforeunload)
        throw Error("Guarda los cambios antes de enviar.");
      await api(`/api/works/${b.dataset.submit}/submit`, {});
      location.reload();
    } catch (e) {
      notify(e.message, true);
    } finally {
      b.disabled = false;
    }
  });
for (const b of document.querySelectorAll("[data-ai]"))
  b.addEventListener("click", async () => {
    const text = b.textContent;
    b.disabled = true;
    b.textContent = "Evaluando el manuscrito…";
    try {
      if (window.onbeforeunload)
        throw Error("Guarda los cambios antes de evaluar.");
      await api(`/api/works/${b.dataset.id}/review`, {
        provider: b.dataset.ai,
      });
      location.reload();
    } catch (e) {
      notify(e.message, true);
    } finally {
      b.disabled = false;
      b.textContent = text;
    }
  });
for (const b of document.querySelectorAll("[data-copy]"))
  b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      notify("Referencia copiada.");
    } catch {
      notify("No fue posible copiar. Usa la descarga BibTeX.", true);
    }
  });
$("#version-select")?.addEventListener(
  "change",
  (e) =>
    (location.href = "/works/" + e.target.dataset.id + "?v=" + e.target.value),
);
const colors = {
    article: "#253ca3",
    problem: "#748260",
    response: "#c05b3e",
    review: "#537d8c",
  },
  relationLabels = {
    extends: "complementa",
    challenges: "cuestiona",
    replicates: "replica",
    supports: "aporta evidencia a",
    responds: "responde a",
    reviews: "revisa",
    addresses: "aborda",
  };
function node(tag, attrs = {}, text) {
  const x = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, v);
  if (text !== undefined) x.textContent = text;
  return x;
}
async function initGraph() {
  const host = $("#knowledge-graph");
  if (!host) return;
  try {
    const r = await fetch("/api/graph");
    if (!r.ok) throw Error("No se pudo cargar el grafo.");
    const data = await r.json();
    const draw = () => {
      const filter = $("#graph-filter").value,
        items = data.nodes.filter((n) => !filter || n.kind === filter),
        ids = new Set(items.map((n) => n.id)),
        edges = data.edges.filter(
          (e) => ids.has(e.source_id) && ids.has(e.target_id),
        );
      host.replaceChildren();
      const list = $("#graph-list");
      list.replaceChildren();
      if (!items.length) {
        host.textContent = "No hay aportes de este tipo.";
        return;
      }
      const width = 1100,
        height = Math.max(500, Math.ceil(items.length / 6) * 180);
      const svg = node("svg", {
        viewBox: `0 0 ${width} ${height}`,
        class: "graph-svg",
        role: "img",
        "aria-label": "Grafo navegable de publicaciones y sus relaciones",
      });
      const defs = node("defs"),
        marker = node("marker", {
          id: "arrow",
          viewBox: "0 0 10 10",
          refX: 10,
          refY: 5,
          markerWidth: 6,
          markerHeight: 6,
          orient: "auto-start-reverse",
        });
      marker.append(
        node("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#90a08b" }),
      );
      defs.append(marker);
      svg.append(defs);
      const positions = new Map();
      items.forEach((n, i) => {
        const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
        const x =
          items.length === 1
            ? 550
            : 550 + Math.cos(angle) * Math.min(400, 150 + items.length * 25);
        const y = height / 2 + Math.sin(angle) * (height / 2 - 95);
        positions.set(n.id, { x, y });
      });
      for (const edge of edges) {
        const a = positions.get(edge.source_id),
          b = positions.get(edge.target_id);
        const dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.sqrt(dx * dx + dy * dy) || 1;
        svg.append(
          node("line", {
            x1: a.x + (dx / d) * 26,
            y1: a.y + (dy / d) * 26,
            x2: b.x - (dx / d) * 30,
            y2: b.y - (dy / d) * 30,
            stroke: edge.relation === "challenges" ? "#b17b59" : "#9dab97",
            "stroke-width": 1.7,
            "marker-end": "url(#arrow)",
          }),
        );
        const t = node(
          "text",
          {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2 - 7,
            "text-anchor": "middle",
            fill: "#61705f",
            "font-size": 11,
          },
          relationLabels[edge.relation] || edge.relation,
        );
        svg.append(t);
      }
      for (const n of items) {
        const { x, y } = positions.get(n.id);
        const a = node("a", { href: "/works/" + n.id, class: "graph-node" });
        a.append(
          node("title", {}, n.title),
          node("circle", {
            cx: x,
            cy: y,
            r: 25,
            fill: colors[n.kind] || colors.article,
          }),
          node(
            "text",
            {
              x,
              y: y + 5,
              "text-anchor": "middle",
              fill: "white",
              "font-family": "Georgia",
              "font-size": 17,
            },
            n.kind === "problem" ? "?" : n.kind === "response" ? "+" : "↗",
          ),
        );
        const words = n.title.split(" "),
          lines = [""];
        for (const word of words) {
          if ((lines.at(-1) + " " + word).length > 30 && lines.length < 3)
            lines.push("");
          lines[lines.length - 1] += (lines.at(-1) ? " " : "") + word;
        }
        lines.forEach((line, i) =>
          a.append(
            node(
              "text",
              {
                x,
                y: y + 47 + i * 16,
                "text-anchor": "middle",
                fill: "#1c3932",
                "font-size": 12,
              },
              line.length > 40 ? line.slice(0, 37) + "…" : line,
            ),
          ),
        );
        svg.append(a);
      }
      host.append(svg);
      const h = document.createElement("h2");
      h.textContent = "Conexiones, en palabras";
      list.append(h);
      if (!edges.length) {
        const p = document.createElement("p");
        p.textContent =
          "Los aportes de esta selección aún no tienen conexiones entre sí.";
        list.append(p);
      }
      for (const edge of edges) {
        const s = items.find((n) => n.id === edge.source_id),
          t = items.find((n) => n.id === edge.target_id);
        const p = document.createElement("p"),
          a = document.createElement("a"),
          b = document.createElement("a");
        a.href = "/works/" + s.id + "?v=" + edge.source_version;
        a.textContent = s.title;
        b.href = "/works/" + t.id + "?v=" + edge.target_version;
        b.textContent = t.title;
        p.append(
          a,
          document.createTextNode(" " + relationLabels[edge.relation] + " "),
          b,
          document.createTextNode(
            ` (v${edge.source_version} → v${edge.target_version}).`,
          ),
        );
        list.append(p);
      }
    };
    draw();
    $("#graph-filter").addEventListener("change", draw);
    $("#graph-reset").addEventListener("click", () => {
      $("#graph-filter").value = "";
      draw();
    });
  } catch (e) {
    host.textContent = e.message;
  }
}
initGraph();

// Reading tools are local to this browser; they never alter a manuscript.
const bookmarkKey = "lumbre.reading-list.v1";
function readBookmarks() {
  try {
    const list = JSON.parse(localStorage.getItem(bookmarkKey) || "[]");
    return Array.isArray(list)
      ? list
          .filter(
            (x) =>
              x &&
              typeof x.id === "string" &&
              /^[a-zA-Z0-9_-]+$/.test(x.id) &&
              typeof x.title === "string" &&
              typeof x.author === "string",
          )
          .slice(0, 200)
      : [];
  } catch {
    return [];
  }
}
const saveReading = $("[data-save-id]");
function syncSavedState() {
  if (!saveReading) return;
  const saved = readBookmarks().some(
    (x) => x.id === saveReading.dataset.saveId,
  );
  saveReading.setAttribute("aria-pressed", String(saved));
  saveReading.textContent = saved ? "Guardado ✓" : "Guardar lectura ＋";
}
syncSavedState();
saveReading?.addEventListener("click", () => {
  try {
    const saved = readBookmarks(),
      id = saveReading.dataset.saveId;
    const exists = saved.some((x) => x.id === id);
    const next = exists
      ? saved.filter((x) => x.id !== id)
      : [
          {
            id,
            title: saveReading.dataset.saveTitle,
            author: saveReading.dataset.saveAuthor,
          },
          ...saved,
        ].slice(0, 200);
    localStorage.setItem(bookmarkKey, JSON.stringify(next));
    syncSavedState();
    notify(
      exists
        ? "Publicación retirada de tu lista."
        : "Guardada en tu lista de lectura de este navegador.",
    );
  } catch {
    notify("Este navegador no permite guardar la lista de lectura.", true);
  }
});
function renderReadingList() {
  const host = $("#reading-list");
  if (!host) return;
  host.replaceChildren();
  const saved = readBookmarks();
  if (!saved.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    const h = document.createElement("h2");
    h.textContent = "Tu próxima lectura empieza aquí.";
    const p = document.createElement("p");
    p.textContent =
      "En una publicación, selecciona «Guardar lectura» para encontrarla en esta lista.";
    empty.append(h, p);
    host.append(empty);
    return;
  }
  for (const entry of saved) {
    const row = document.createElement("article");
    row.className = "saved-row";
    const copy = document.createElement("div"),
      h = document.createElement("h2"),
      a = document.createElement("a"),
      p = document.createElement("p"),
      remove = document.createElement("button");
    a.href = "/works/" + entry.id;
    a.textContent = entry.title;
    h.append(a);
    p.textContent = entry.author;
    copy.append(h, p);
    remove.className = "button secondary small";
    remove.textContent = "Quitar";
    remove.setAttribute("aria-label", "Quitar " + entry.title);
    remove.addEventListener("click", () => {
      try {
        localStorage.setItem(
          bookmarkKey,
          JSON.stringify(readBookmarks().filter((x) => x.id !== entry.id)),
        );
        renderReadingList();
      } catch {
        notify("No se pudo actualizar la lista.", true);
      }
    });
    row.append(copy, remove);
    host.append(row);
  }
}
renderReadingList();
window.addEventListener("storage", (e) => {
  if (e.key === bookmarkKey) {
    syncSavedState();
    renderReadingList();
  }
});
$("#reader-focus")?.addEventListener("click", (e) => {
  const active = document.body.classList.toggle("reader-focus");
  e.currentTarget.setAttribute("aria-pressed", String(active));
  e.currentTarget.textContent = active ? "Salir de lectura" : "Modo lectura";
});
$("#reader-size")?.addEventListener("click", (e) => {
  const active = document.body.classList.toggle("reader-large");
  e.currentTarget.setAttribute("aria-pressed", String(active));
  e.currentTarget.setAttribute(
    "aria-label",
    active ? "Restablecer tamaño de letra" : "Aumentar tamaño de letra",
  );
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("reader-focus"))
    $("#reader-focus")?.click();
});
if ("IntersectionObserver" in window && $(".article-toc")) {
  const links = [...document.querySelectorAll(".article-toc a")];
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((x) => x.isIntersecting);
      if (!visible) return;
      for (const a of links) {
        const active = a.hash === "#" + visible.target.id;
        a.classList.toggle("active", active);
        if (active) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      }
    },
    { rootMargin: "-5% 0px -70% 0px" },
  );
  for (const a of links) {
    const section = document.getElementById(a.hash.slice(1));
    if (section) observer.observe(section);
  }
}
// Authoring aids supplement server validation. Preview uses text nodes only.
if (workForm) {
  const group = workForm.querySelector(".form-grid");
  for (const [id, number, label] of [
    ["kind", "01", "Identificación"],
    ["question", "02", "Investigación"],
    ["references", "03", "Fuentes y declaraciones"],
  ]) {
    const field = workForm.querySelector("#" + id)?.closest(".field");
    if (field) {
      const h = document.createElement("h2");
      h.className = "form-section-heading";
      const n = document.createElement("small");
      n.textContent = number;
      h.append(n, document.createTextNode(label));
      group.insertBefore(h, field);
    }
  }
  const progress = document.createElement("div");
  progress.className = "manuscript-progress";
  const progressLabel = document.createElement("span"),
    bar = document.createElement("progress");
  bar.max = 8;
  bar.setAttribute("aria-label", "Secciones básicas completadas");
  progress.append(progressLabel, bar);
  workForm.prepend(progress);
  const required = [
    ["title", 8],
    ["abstract", 30],
    ["question", 80],
    ["method", 80],
    ["results", 80],
    ["limitations", 40],
    ["references", 20],
    ["ai_disclosure", 1],
  ];
  const update = () => {
    const count = required.filter(
      ([n, min]) =>
        (n === "results" && workForm.elements.kind.value === "problem") ||
        workForm.elements[n].value.trim().length >= min,
    ).length;
    bar.value = count;
    progressLabel.textContent = `${count} de 8 secciones básicas`;
  };
  update();
  workForm.addEventListener("input", update);
  workForm.addEventListener("change", update);
  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.className = "button secondary";
  previewButton.textContent = "Vista previa";
  previewButton.setAttribute("aria-expanded", "false");
  previewButton.setAttribute("aria-controls", "draft-preview");
  workForm.querySelector(".form-actions").append(previewButton);
  const preview = document.createElement("section");
  preview.id = "draft-preview";
  preview.className = "draft-preview prose";
  preview.hidden = true;
  preview.setAttribute("aria-label", "Vista previa local del borrador");
  workForm.append(preview);
  previewButton.addEventListener("click", () => {
    const open = preview.hidden;
    preview.hidden = !open;
    previewButton.setAttribute("aria-expanded", String(open));
    previewButton.textContent = open ? "Cerrar vista previa" : "Vista previa";
    if (!open) return;
    preview.replaceChildren();
    const title = document.createElement("h2");
    title.textContent =
      workForm.elements.title.value || "Manuscrito sin título";
    preview.append(title);
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent =
      "Vista previa del texto actual. Guarda el borrador para conservar los cambios.";
    preview.append(note);
    for (const [id, label] of [
      ["abstract", "Resumen"],
      ["question", "Pregunta y contexto"],
      ["method", "Método"],
      ["results", "Resultados o argumento"],
      ["limitations", "Limitaciones"],
      ["claims", "Afirmaciones"],
      ["references", "Referencias"],
      ["ai_disclosure", "Declaración de uso de IA"],
      ["funding", "Financiación"],
      ["conflicts", "Conflictos de interés"],
      ["ethics", "Consideraciones éticas"],
      ["data_availability", "Datos y materiales"],
    ]) {
      const h = document.createElement("h3");
      h.textContent = label;
      const p = document.createElement("div");
      p.className = "preview-section";
      p.textContent = workForm.elements[id].value || "Sección pendiente.";
      if (!workForm.elements[id].value) p.classList.add("preview-empty");
      preview.append(h, p);
    }
    preview.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  });
}
