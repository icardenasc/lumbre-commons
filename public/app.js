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
    article: "#1c3932",
    problem: "#98aa73",
    response: "#be855f",
    review: "#688a9a",
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
