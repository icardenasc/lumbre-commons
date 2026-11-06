import {
  Env,
  User,
  Work,
  Version,
  Body,
  escapeHtml as e,
  kinds,
  relations,
  fields,
  fail,
  canonical,
  hash,
} from "./model";
import { publicWorks, publicDetail } from "./worker";
const date = (s: string) =>
  new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z").toLocaleDateString(
    "es-CO",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "America/Bogota",
    },
  );
const tag = (w: Work) =>
  `<span class="badge ${e(w.kind)}">${e(kinds[w.kind])}</span>`;
const button = (label: string, href: string, cls = "primary") =>
  `<a class="button ${cls}" href="${e(href)}">${label}</a>`;
function shell(
  title: string,
  body: string,
  u: User | null,
  path: string,
  meta = "",
  status = 200,
) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} · Lumbre</title><meta name="description" content="Un espacio abierto para publicar investigación, conectar evidencia y resolver problemas en colaboración."><link rel="icon" href="/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css">${meta}<script src="/app.js" defer></script></head><body><a class="sr-only" href="#main">Saltar al contenido</a><header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="Lumbre, inicio"><img class="brand-mark" src="/mark.svg" alt="" width="34" height="34"><span class="brand-name">lumbre<span class="brand-dot">.</span></span></a><nav class="nav" aria-label="Principal">${[
      ["/explore", "Explorar"],
      ["/problems", "Problemas"],
      ["/graph", "Conexiones"],
      ["/journal", "Cuadernos"],
    ]
      .map(
        ([href, label]) =>
          `<a class="nav-link ${path === href ? "active" : ""}" href="${href}">${label}</a>`,
      )
      .join(
        "",
      )}</nav><div class="header-actions">${u ? `<a class="nav-link" href="/workspace">Mi espacio</a>` : `<a class="nav-link" href="/login">Entrar</a>`}${button('Publicar <span aria-hidden="true">↗</span>', "/submit", "primary small")}</div></div></header><main id="main">${body}</main><footer class="footer"><div class="container footer-grid"><div><a class="brand" href="/">lumbre.</a><p class="muted">Una idea enciende la siguiente.</p></div><div><a href="/about">El proyecto</a><a href="/principles">Criterios editoriales</a><a href="/llms.txt">Para agentes</a></div><div><a href="/terms">Términos</a><a href="/privacy">Privacidad</a>${u ? '<a href="/account">Mi cuenta</a>' : '<a href="/register">Crear cuenta</a>'}</div><p class="muted">Conocimiento abierto.<br>Hecho para seguir preguntando.</p></div></footer><div id="toast" class="toast" role="status" hidden></div></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
function card(w: Work) {
  return `<article class="card"><div class="card-top">${tag(w)}<span class="muted">${e(w.field)}</span></div><h3 class="card-title"><a href="/works/${e(w.id)}">${e(w.title)}</a></h3><p class="card-abstract">${e(w.abstract.slice(0, 220))}${w.abstract.length > 220 ? "…" : ""}</p><div class="card-meta"><span class="avatar">${e((w.author || "L").slice(0, 1))}</span><a href="/people/${e(w.username)}">${e(w.author)}</a><span class="muted">v${w.published_version}</span></div></article>`;
}
function cards(
  ws: Work[],
  empty = "Todavía no hay publicaciones con estos filtros.",
) {
  return ws.length
    ? `<div class="grid">${ws.map(card).join("")}</div>`
    : `<div class="empty"><h3>Aquí empieza la siguiente pregunta.</h3><p>${e(empty)}</p>${button("Proponer un aporte", "/submit", "secondary")}</div>`;
}
function hero() {
  return `<div class="network-hero"><svg viewBox="0 0 550 400" role="img" aria-label="Esquema: una pregunta conecta un artículo, evidencia, una respuesta y una nueva pregunta"><defs><pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#d5dcd0"/></pattern></defs><rect width="550" height="400" fill="url(#dots)"/><g stroke="#9aaf9d" stroke-width="1.5" fill="none"><path d="M100 100 Q220 40 280 170T450 95M100 100Q60 250 185 300M280 170L185 300M280 170Q340 260 450 300M450 95L450 300"/><path d="M185 300Q325 370 450 300" stroke-dasharray="5 6"/></g><g fill="#f8f6ef" stroke="#617965"><circle cx="100" cy="100" r="26"/><circle cx="185" cy="300" r="23"/><circle cx="450" cy="95" r="23"/><circle cx="450" cy="300" r="26"/></g><circle cx="280" cy="170" r="54" fill="#1c3932"/><circle cx="280" cy="170" r="66" fill="none" stroke="#c3d198" stroke-width="1"/><g fill="#1c3932" font-family="system-ui" font-size="12"><text x="100" y="105" text-anchor="middle">?</text><text x="100" y="147" text-anchor="middle">UNA PREGUNTA</text><text x="185" y="304" text-anchor="middle">↗</text><text x="185" y="344" text-anchor="middle">EVIDENCIA</text><text x="450" y="99" text-anchor="middle">+</text><text x="450" y="137" text-anchor="middle">OTRA PERSPECTIVA</text><text x="450" y="305" text-anchor="middle">?</text><text x="450" y="347" text-anchor="middle">UN NUEVO PROBLEMA</text></g><text x="280" y="167" fill="#f8f6ef" font-family="Georgia" font-size="20" text-anchor="middle">Tu aporte</text><text x="280" y="189" fill="#cbd6b9" font-family="system-ui" font-size="10" text-anchor="middle">EL PUNTO DE PARTIDA</text></svg><p class="network-caption">El valor de una idea también está en lo que conecta.</p></div>`;
}
function textBlock(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${e(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
function references(s: string) {
  return s
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      let html = "",
        last = 0;
      for (const m of line.matchAll(/https?:\/\/[^\s<>"']+/g)) {
        html +=
          e(line.slice(last, m.index)) +
          `<a href="${e(m[0])}" target="_blank" rel="noopener noreferrer nofollow">${e(m[0])}</a>`;
        last = m.index! + m[0].length;
      }
      return `<p>${html + e(line.slice(last))}</p>`;
    })
    .join("");
}
function input(
  name: string,
  label: string,
  value = "",
  type = "text",
  required = false,
  extra = "",
) {
  return `<div class="field"><label for="${e(name)}">${label}</label><input id="${e(name)}" name="${e(name)}" type="${type}" value="${e(value)}" ${required ? "required" : ""} ${extra}></div>`;
}
function area(name: string, label: string, value = "", help = "", rows = 5) {
  return `<div class="field full"><label for="${name}">${label}</label>${help ? `<p class="muted">${help}</p>` : ""}<textarea id="${name}" name="${name}" rows="${rows}" maxlength="${({ abstract: 3000, question: 8000, method: 12000, results: 18000, limitations: 6000, references: 10000, ai_disclosure: 2000, claims: 4808 } as Record<string, number>)[name] || 10000}">${e(value)}</textarea></div>`;
}
function manuscriptForm(w: Work | null, b: Body | null, target: any) {
  const body = b || {
      question: "",
      method: "",
      results: "",
      limitations: "",
      references: "",
      claims: [],
      ai_disclosure: "",
      license: "CC-BY-4.0",
      consent: false,
      ai_consent: false,
    },
    kind = w?.kind || (target ? "response" : "article");
  return `<form id="work-form" data-work-id="${e(w?.id || "")}" data-revision="${w?.draft_revision || 0}" class="panel"><div class="form-grid"><div class="field"><label for="kind">Tipo de aporte</label><select name="kind" id="kind">${Object.entries(
    kinds,
  )
    .map(
      ([k, l]) =>
        `<option value="${k}" ${k === kind ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="field"><label for="field">Disciplina</label><select name="field" id="field">${fields.map((f) => `<option ${f === w?.field ? "selected" : ""}>${f}</option>`).join("")}</select></div><div class="field full"><label for="title">Título</label><input id="title" name="title" value="${e(w?.title || "")}" minlength="8" maxlength="240" placeholder="La pregunta o idea que quieres compartir" required></div>${area("abstract", "Resumen", w?.abstract || "", "Explica qué aportas y por qué merece discutirse.", 4)}${
    target
      ? `<div class="notice full">Tu aporte se vinculará a <a href="/works/${e(target.id)}?v=${target.version}">${e(target.title)} · v${target.version}</a>. La relación aparecerá en ambas publicaciones.<input type="hidden" name="target_id" value="${e(target.id)}"><input type="hidden" name="target_version" value="${target.version}"></div><div class="field"><label for="relation">Relación con el trabajo</label><select id="relation" name="relation">${Object.entries(
          relations,
        )
          .map(
            ([k, v]) =>
              `<option value="${k}" ${k === (b?.relation || "responds") ? "selected" : ""}>${v}</option>`,
          )
          .join(
            "",
          )}</select></div><div class="field"><label for="target_claim">Afirmación concreta (opcional)</label><select id="target_claim" name="target_claim"><option value="">El trabajo completo</option>${target.claims.map((c: string) => `<option value="${e(c)}" ${c === b?.target_claim ? "selected" : ""}>${e(c)}</option>`).join("")}</select></div>`
      : `<details class="full"><summary>¿Quieres responder o complementar un trabajo?</summary><p>Abre su ficha y elige «Responder con un aporte» para enlazar la versión y sus afirmaciones.</p></details>`
  }${area("question", "Pregunta y contexto", body.question, "Delimita el problema, el estado del conocimiento y el aporte propuesto. En derecho, indica jurisdicción y marco temporal.")}${area("method", "Método o criterio de resolución", body.method, "Describe cómo llegaste al resultado. Para un problema abierto, explica qué contaría como una respuesta satisfactoria.")}${area("results", "Resultados o argumento", body.results, "Expón el análisis, incluyendo evidencia y contraargumentos. Un problema abierto puede dejar este campo vacío.", 8)}${area("limitations", "Limitaciones", body.limitations, "Indica qué no permiten concluir tus datos o tu argumento.", 3)}${area("claims", "Afirmaciones principales", body.claims.join("\n"), "Una por línea, hasta ocho. Otras personas podrán responder a una afirmación concreta.", 4)}${area("references", "Referencias", body.references, "Una referencia por línea. Incluye autor, título, fecha y URL o DOI verificable. Puedes usar APA o Chicago de manera consistente.", 5)}${area("ai_disclosure", "Declaración de uso de IA", body.ai_disclosure, "Indica herramientas, tareas realizadas y comprobaciones humanas. Si no usaste IA, decláralo.", 3)}<label class="check-label full"><input type="checkbox" name="consent" ${body.consent ? "checked" : ""}> Soy responsable del contenido, cuento con derechos para publicarlo y acepto su licencia CC BY 4.0 y los <a href="/terms">términos</a>.</label><label class="check-label full"><input type="checkbox" name="ai_consent" ${body.ai_consent ? "checked" : ""}> Autorizo que este manuscrito se envíe a OpenAI o Anthropic si solicito una evaluación automática. Es opcional y no afecta el envío editorial.</label></div><div id="form-error" class="notice error" role="alert" hidden></div><div class="form-actions"><button class="button primary" type="submit">Guardar borrador</button><span class="muted">Tu borrador es privado hasta su publicación.</span></div></form>`;
}
function reviewCards(reviews: any[]) {
  if (!reviews.length)
    return `<p class="muted">Esta versión aún no tiene evaluaciones automáticas completadas.</p>`;
  const names: Record<string, string> = {
    clarity: "Claridad",
    method: "Método",
    evidence: "Evidencia presentada",
    limitations: "Limitaciones",
    reproducibility: "Trazabilidad",
  };
  return reviews
    .map((r) => {
      if (r.status !== "completed")
        return `<div class="review-card"><strong>${e(r.provider)} · ${e(r.model)}</strong><p>${r.status === "failed" ? "Evaluación no completada; sin puntuación." : "Evaluación en curso."}</p></div>`;
      let result = JSON.parse(r.result);
      return `<details class="review-card"><summary>${e(r.provider)} · ${e(r.model)} · ver rúbrica</summary><p>${e(result.summary)}</p><div class="metric-grid">${Object.entries(
        result.dimensions,
      )
        .map(
          ([k, v]: [string, any]) =>
            `<div class="metric"><strong>${e(names[k])} ${e(v.score)}/4</strong><p>${e(v.reason)}</p></div>`,
        )
        .join("")}</div>${[
        ["strengths", "Fortalezas"],
        ["concerns", "Aspectos a revisar"],
        ["checks_needed", "Comprobaciones pendientes"],
      ]
        .map(
          ([k, title]) =>
            `<h4>${title}</h4><ul>${result[k].map((x: string) => `<li>${e(x)}</li>`).join("")}</ul>`,
        )
        .join(
          "",
        )}<p class="muted">Evaluación asistida, anclada a la huella del manuscrito. No certifica resultados ni equivale a revisión por pares.</p></details>`;
    })
    .join("");
}
export async function render(
  req: Request,
  env: Env,
  url: URL,
  u: User | null,
): Promise<Response> {
  const path = url.pathname;
  if (path === "/") {
    const works = await publicWorks(env),
      problems = works.filter((w) => w.kind === "problem");
    return shell(
      "Una idea enciende la siguiente",
      `<div class="container"><section class="hero"><div><p class="eyebrow"><span class="status-dot"></span> UN HUB DE CONOCIMIENTO ABIERTO</p><h1 class="hero-title">El conocimiento<br>no termina<br>en un <em>paper.</em></h1><p class="hero-copy">Publica lo que descubriste. Conecta la evidencia. Cuestiona una idea. Encuentra personas con quienes resolver la siguiente pregunta.</p><div class="hero-actions">${button('Explorar conocimiento <span aria-hidden="true">↗</span>', "/explore")}${button("Tengo una pregunta", "/submit?kind=problem", "secondary")}</div><p class="muted">Para personas curiosas. Con rigor, apertura y espacio para la IA.</p></div>${hero()}</section><section class="stats" aria-label="Actividad del repositorio"><div class="stat"><span class="stat-value">${works.length}</span><span class="stat-label">aportes publicados</span></div><div class="stat"><span class="stat-value">${problems.length}</span><span class="stat-label">problemas para explorar</span></div><div class="stat"><span class="stat-value">CC BY</span><span class="stat-label">conocimiento reutilizable</span></div><div class="stat"><span class="stat-value">↗</span><span class="stat-label">una conversación que continúa</span></div></section><section><div class="section-head"><div><p class="eyebrow">EL PUNTO DE PARTIDA</p><h2 class="section-title">Ideas que abren caminos.</h2></div><a class="text-link" href="/explore">Ver todos los aportes ↗</a></div>${cards(works.slice(0, 3))}</section><section class="split"><div><p class="eyebrow">DEL «¿Y SI…?» AL «LO HICIMOS»</p><h2 class="section-title">Hay preguntas que merecen más de una mente.</h2><p class="hero-copy">El banco de problemas conecta preguntas abiertas con métodos, datos y personas que pueden aportar. Empieza por lo que sabes hacer.</p>${button("Explorar problemas", "/problems", "secondary")}</div><div class="panel"><p class="eyebrow">CÓMO CONTINÚA UNA IDEA</p><ol class="step-list"><li><strong>Comparte con fundamento.</strong><p>Pregunta, método, argumentos, fuentes y límites.</p></li><li><strong>Conecta una respuesta.</strong><p>Complementa, cuestiona o replica una versión concreta.</p></li><li><strong>Deja el camino abierto.</strong><p>Conserva versiones y reconoce cada contribución.</p></li></ol></div></section></div>`,
      u,
      path,
    );
  }
  if (["/explore", "/problems", "/journal"].includes(path)) {
    const kind =
        path === "/problems" ? "problem" : url.searchParams.get("kind") || "",
      q = url.searchParams.get("q") || "",
      field = url.searchParams.get("field") || "";
    let works = await publicWorks(env, q, kind, field);
    if (path === "/journal")
      works = works.filter((w) => w.collection === "cuadernos");
    const title =
      path === "/problems"
        ? "Preguntas en busca de equipo."
        : path === "/journal"
          ? "Cuadernos de Lumbre."
          : "Conocimiento para seguir construyendo.";
    return shell(
      title,
      `<div class="container"><div class="page-heading"><p class="eyebrow">${path === "/journal" ? "COLECCIÓN EDITORIAL" : path === "/problems" ? "BANCO DE PROBLEMAS" : "REPOSITORIO ABIERTO"}</p><h1 class="section-title">${title}</h1><p class="hero-copy">${path === "/journal" ? "Una selección de aportes para leer en conjunto. Cada trabajo conserva su autoría, versiones y estado de revisión." : path === "/problems" ? "Una pregunta bien formulada ya es un aporte. Encuentra una, propón un método y suma tu perspectiva." : "Artículos, revisiones y respuestas que se conectan. Busca por pregunta, título o disciplina."}</p></div><form class="search-form toolbar" method="get"><label class="sr-only" for="q">Buscar conocimiento</label><input class="search-input" id="q" name="q" value="${e(q)}" placeholder="¿Qué te da curiosidad?"><label class="sr-only" for="filter-field">Disciplina</label><select id="filter-field" name="field"><option value="">Todas las disciplinas</option>${fields.map((f) => `<option ${field === f ? "selected" : ""}>${f}</option>`).join("")}</select><button class="button secondary">Buscar</button></form>${
        path === "/explore"
          ? `<nav class="tabs" aria-label="Tipo de aporte"><a class="tab ${!kind ? "active" : ""}" href="/explore">Todo</a>${Object.entries(
              kinds,
            )
              .map(
                ([k, v]) =>
                  `<a class="tab ${kind === k ? "active" : ""}" href="/explore?kind=${k}">${v}</a>`,
              )
              .join("")}</nav>`
          : ""
      }<div class="section-head"><p class="muted">${works.length} aportes${works.length === 100 ? " (primeros 100)" : ""}</p>${button(path === "/problems" ? "Proponer un problema" : "Publicar un aporte", path === "/problems" ? "/submit?kind=problem" : "/submit", "secondary small")}</div>${cards(works)}</div>`,
      u,
      path,
    );
  }
  if (path === "/graph")
    return shell(
      "Conexiones",
      `<div class="container"><div class="page-heading"><p class="eyebrow">EL CONOCIMIENTO SE CONECTA</p><h1 class="section-title">Sigue el hilo de una idea.</h1><p class="hero-copy">Explora relaciones declaradas entre publicaciones. Cada conexión conserva quién la propuso y a qué versión responde.</p></div><div class="toolbar"><label for="graph-filter">Filtrar por tipo</label><select id="graph-filter"><option value="">Todos los aportes</option>${Object.entries(
        kinds,
      )
        .map(([k, v]) => `<option value="${k}">${v}</option>`)
        .join(
          "",
        )}</select><button class="button secondary small" id="graph-reset">Restablecer</button></div><div class="graph-wrap" id="knowledge-graph"><p class="muted">Cargando conexiones…</p></div><div class="graph-legend"><span class="badge problem">Problemas</span><span class="badge">Artículos</span><span class="badge response">Respuestas</span><span class="badge review">Revisiones</span></div><p class="muted">Selecciona un nodo para leer el aporte. «Cuestiona» describe una objeción de su autor; no una refutación verificada.</p><div id="graph-list" class="panel"></div></div>`,
      u,
      path,
    );
  if (path === "/login" || path === "/register") {
    const reg = path === "/register";
    let next = url.searchParams.get("next") || "/workspace";
    try {
      const resolved = new URL(next, url.origin);
      next =
        resolved.origin === url.origin && !/[\\\x00-\x1f]/.test(next)
          ? resolved.pathname + resolved.search + resolved.hash
          : "/workspace";
    } catch {
      next = "/workspace";
    }
    return shell(
      reg ? "Crear cuenta" : "Entrar",
      `<div class="container auth-layout"><aside class="auth-aside"><p class="eyebrow">EL CONOCIMIENTO NECESITA TU PERSPECTIVA</p><h1 class="section-title">Tu próxima pregunta<br>tiene un lugar aquí.</h1><p class="hero-copy">Investiga, publica y conecta tus aportes con una comunidad abierta al debate.</p></aside><section class="panel"><h2>${reg ? "Crea tu espacio" : "Qué bueno verte aquí."}</h2><form id="auth-form" data-mode="${reg ? "register" : "login"}" data-next="${e(next.startsWith("/") && !next.startsWith("//") ? next : "/workspace")}">${reg ? input("name", "Nombre público", "", "text", true, 'maxlength="80" autocomplete="name"') : ""}${input("username", "Nombre de usuario", "", "text", true, 'minlength="3" maxlength="32" pattern="[a-z0-9][a-z0-9_-]{2,31}" autocomplete="username" autocapitalize="none"')}${input("password", "Contraseña", "", "password", true, `minlength="12" maxlength="128" autocomplete="${reg ? "new-password" : "current-password"}"`)}${reg ? '<p class="muted">Al crear tu cuenta aceptas los <a href="/terms">términos</a> y la <a href="/privacy">política de privacidad</a>. Guarda tu contraseña en un gestor; esta primera versión no recupera cuentas por correo.</p>' : ""}<div id="form-error" class="notice error" role="alert" hidden></div><div class="form-actions"><button class="button primary">${reg ? "Crear cuenta" : "Entrar"}</button></div></form><p class="muted">${reg ? '¿Ya tienes cuenta? <a href="/login">Entrar</a>' : '¿Primera vez? <a href="/register">Crear cuenta</a>'}</p></section></div>`,
      u,
      path,
      '<meta name="robots" content="noindex">',
    );
  }
  if (
    ["/workspace", "/submit", "/account", "/editor"].includes(path) ||
    /^\/(workspace|editor)\//.test(path)
  ) {
    if (!u)
      return Response.redirect(
        new URL(
          "/login?next=" + encodeURIComponent(path + url.search),
          url.origin,
        ).href,
        302,
      );
    if (path.startsWith("/editor") && u.role !== "editor")
      fail(403, "Acceso editorial requerido.");
    if (path === "/account")
      return shell(
        "Mi cuenta",
        `<div class="container narrow"><div class="page-heading"><p class="eyebrow">MI CUENTA</p><h1 class="section-title">${e(u.name)}</h1><p>@${e(u.username)} · ${u.role === "editor" ? "Editor" : "Autor"}</p></div><div class="panel"><h2>Cambiar contraseña</h2><form id="password-form">${input("current", "Contraseña actual", "", "password", true, 'autocomplete="current-password"')}${input("password", "Nueva contraseña", "", "password", true, 'minlength="12" maxlength="128" autocomplete="new-password"')}<button class="button primary">Guardar contraseña</button></form></div>${u.role !== "editor" ? `<details class="panel"><summary>Configuración del propietario</summary><p>Solo para la persona que administra este proyecto.</p><form id="owner-form">${input("token", "Código de configuración", "", "password", true)}<button class="button secondary">Activar cuenta editorial</button></form></details>` : button("Ir a la mesa editorial", "/editor", "secondary")}<button class="button secondary" id="logout">Cerrar sesión</button></div>`,
        u,
        path,
        '<meta name="robots" content="noindex">',
      );
    if (path === "/workspace" || path === "/editor") {
      const editor = path === "/editor",
        rows = (
          await env.DB.prepare(
            `SELECT w.*,u.name AS author,u.username FROM works w JOIN users u ON u.id=w.owner_id WHERE ${editor ? "w.status='submitted'" : "w.owner_id=?"} ORDER BY updated_at DESC LIMIT 100`,
          )
            .bind(...(editor ? [] : [u.id]))
            .all<Work>()
        ).results;
      return shell(
        editor ? "Mesa editorial" : "Mi espacio",
        `<div class="container"><div class="page-heading"><p class="eyebrow">${editor ? "DECISIONES CON TRAZABILIDAD" : "TU MESA DE TRABAJO"}</p><h1 class="section-title">${editor ? "Mesa editorial." : `Hola, ${e(u.name.split(" ")[0])}.`}</h1><p class="hero-copy">${editor ? "Revisa el manuscrito completo y documenta cada decisión. La publicación en el repositorio no certifica revisión por pares." : "Aquí viven tus preguntas, borradores y nuevas versiones."}</p><div class="hero-actions">${button("Nuevo aporte", "/submit")}${u.role === "editor" ? button(editor ? "Mi espacio" : "Mesa editorial", editor ? "/workspace" : "/editor", "secondary") : ""}${button("Mi cuenta", "/account", "secondary")}</div></div>${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Aporte</th><th>Estado</th><th>Versión pública</th><th></th></tr></thead><tbody>${rows.map((w) => `<tr><td><strong>${e(w.title)}</strong><br><span class="muted">${e(kinds[w.kind])} · ${e(w.author)}</span></td><td>${e({ draft: "Borrador", submitted: "En revisión editorial", published: "Publicado", withdrawn: "Retirado" }[w.status] || w.status)}</td><td>${w.published_version ? `<a href="/works/${w.id}">v${w.published_version} ↗</a>` : "—"}</td><td><a class="button secondary small" href="/${editor ? "editor" : "workspace"}/${w.id}">${editor ? "Revisar" : "Abrir"}</a></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty"><h3>Un espacio para la siguiente idea.</h3><p>Tus aportes aparecerán aquí.</p></div>'}</div>`,
        u,
        path,
        '<meta name="robots" content="noindex">',
      );
    }
    let w: Work | null = null,
      b: Body | null = null,
      target: any = null;
    const id = path.split("/")[2];
    if (id) {
      w = await env.DB.prepare(
        "SELECT w.*,u.name as author,u.username FROM works w JOIN users u ON u.id=w.owner_id WHERE w.id=?",
      )
        .bind(id)
        .first<Work>();
      if (!w || (w.owner_id !== u.id && u.role !== "editor"))
        fail(404, "Trabajo no encontrado.");
      b = JSON.parse(w!.body);
    }
    if (b?.target_id || url.searchParams.get("target")) {
      const { w: tw, v } = await publicDetail(
        env,
        b?.target_id || url.searchParams.get("target")!,
        b?.target_version || Number(url.searchParams.get("v")) || undefined,
      );
      target = {
        id: tw.id,
        title: v.title,
        version: v.number,
        claims: JSON.parse(v.body).claims,
      };
    }
    if (!w && url.searchParams.get("kind") === "problem")
      w = { kind: "problem", field: fields[0] } as Work;
    const reviewRows = id
      ? (
          await env.DB.prepare(
            "SELECT * FROM reviews WHERE work_id=? AND content_hash=? ORDER BY created_at DESC",
          )
            .bind(id, await hash(canonical(w!)))
            .all()
        ).results
      : [];
    const editor = path.startsWith("/editor/");
    const locked = w?.status === "submitted" || w?.status === "withdrawn";
    const content =
      editor || locked
        ? `<div class="panel prose"><h2>${e(w!.title)}</h2><p class="paper-abstract">${e(w!.abstract)}</p>${[
            ["Pregunta y contexto", b!.question],
            ["Método", b!.method],
            ["Resultados", b!.results],
            ["Limitaciones", b!.limitations],
            ["Referencias", b!.references],
            ["Uso de IA", b!.ai_disclosure],
          ]
            .map(([h, t]) => `<h3>${h}</h3>${textBlock(t)}`)
            .join(
              "",
            )}<h3>Afirmaciones</h3><ol>${b!.claims.map((x) => `<li>${e(x)}</li>`).join("")}</ol></div>`
        : manuscriptForm(w, b, target);
    return shell(
      editor ? "Revisar manuscrito" : id ? "Tu manuscrito" : "Nuevo aporte",
      `<div class="container narrow"><div class="page-heading"><p class="eyebrow">${editor ? "MESA EDITORIAL" : "DE UNA IDEA A UN APORTE"}</p><h1 class="section-title">${editor ? "Leer. Evaluar. Documentar." : id ? "Tu manuscrito." : "Comparte una nueva perspectiva."}</h1><p class="muted">${editor ? "Verifica fuentes, autoría, método, límites y posibles conflictos antes de decidir." : locked ? "El envío está en revisión editorial. La versión enviada se conserva sin cambios." : "El rigor comienza con una pregunta clara y un método que otros puedan seguir."}</p></div>${w?.editor_note ? `<div class="notice"><strong>Nota editorial</strong><p>${e(w.editor_note)}</p></div>` : ""}${content}${id ? `<section class="panel"><h2>Evaluación metodológica con IA</h2><p>Una lectura adicional del manuscrito. Sus observaciones son separadas de la decisión editorial.</p>${reviewCards(reviewRows)}${env.AI_ENABLED === "true" ? `<div class="form-actions">${env.OPENAI_API_KEY ? `<button class="button secondary" data-ai="openai" data-id="${id}">Evaluar con OpenAI</button>` : ""}${env.ANTHROPIC_API_KEY ? `<button class="button secondary" data-ai="anthropic" data-id="${id}">Evaluar con Anthropic</button>` : ""}</div>` : '<p class="muted">La evaluación automática aún no está activada. Puedes continuar con el envío editorial.</p>'}</section>${editor && w!.status === "submitted" ? `<form id="decision-form" class="panel" data-id="${id}" data-revision="${w!.draft_revision}"><h2>Decisión editorial</h2>${area("note", "Motivación de la decisión", "", "Explica los controles realizados y los cambios necesarios.", 4)}<label class="check-label"><input type="checkbox" name="collection"> Incluir en la colección Cuadernos</label><div class="form-actions"><button class="button primary" name="decision" value="publish">Publicar en repositorio</button><button class="button secondary" name="decision" value="return">Solicitar cambios</button></div><p class="muted">Esta decisión no concede sello de revisión por pares ni indexación.</p></form>` : !locked && !editor ? `<div class="panel"><h2>¿Listo para compartir?</h2><p>Guarda tus cambios y envía el manuscrito. El equipo editorial revisará su admisibilidad antes de publicarlo.</p><button class="button primary" data-submit="${id}">Enviar a revisión editorial</button></div>` : ""}` : ""}</div>`,
      u,
      path,
      '<meta name="robots" content="noindex">',
    );
  }
  if (path.startsWith("/works/")) {
    const id = path.split("/")[2],
      { w, v } = await publicDetail(
        env,
        id,
        url.searchParams.has("v")
          ? Number(url.searchParams.get("v"))
          : undefined,
      ),
      b: Body = JSON.parse(v.body);
    const edges = (
      await env.DB.prepare(
        "SELECT e.*,s.owner_id AS source_owner,t.owner_id AS target_owner,sv.title AS source_title,tv.title AS target_title FROM edges e JOIN works s ON s.id=e.source_id JOIN works t ON t.id=e.target_id JOIN versions sv ON sv.work_id=e.source_id AND sv.number=e.source_version JOIN versions tv ON tv.work_id=e.target_id AND tv.number=e.target_version WHERE ((e.source_id=? AND e.source_version=?) OR (e.target_id=? AND e.target_version=?)) AND s.status!='withdrawn' AND t.status!='withdrawn' ORDER BY e.created_at DESC LIMIT 100",
      )
        .bind(id, v.number, id, v.number)
        .all<any>()
    ).results;
    const reviews = (
      await env.DB.prepare(
        "SELECT * FROM reviews WHERE work_id=? AND content_hash=? AND status='completed'",
      )
        .bind(id, v.hash)
        .all()
    ).results;
    const collabs = (
      await env.DB.prepare(
        "SELECT u.name,u.username,c.contribution FROM collaborations c JOIN users u ON u.id=c.user_id WHERE c.work_id=?",
      )
        .bind(id)
        .all<any>()
    ).results;
    const meta = `<link rel="canonical" href="${env.APP_URL}/works/${id}"><meta name="citation_title" content="${e(v.title)}"><meta name="citation_author" content="${e(w.author)}"><meta name="citation_publication_date" content="${v.created_at.slice(0, 10).replace(/-/g, "/")}"><meta name="citation_pdf_url" content="${env.APP_URL}/works/${id}.pdf?v=${v.number}"><meta name="citation_language" content="es">${w.status === "withdrawn" ? '<meta name="robots" content="noindex">' : ""}`;
    return shell(
      v.title,
      `<div class="container"><div class="page-heading"><a class="text-link" href="/explore">← Volver al conocimiento</a></div><div class="article-layout"><article class="article-main"><div class="card-top">${tag(w)}<span class="muted">${e(w.field)}</span></div><h1 class="paper-title">${e(v.title)}</h1><div class="card-meta"><span class="avatar">${e(w.author?.slice(0, 1))}</span><a href="/people/${e(w.username)}">${e(w.author)}</a><span>${date(v.created_at)}</span><span>v${v.number}</span></div>${w.status === "withdrawn" ? `<div class="notice error"><strong>Publicación retirada</strong><p>${e(w.editor_note)}</p><p>Se conserva el registro para mantener la trazabilidad.</p></div>` : ""}${v.number < w.published_version ? `<div class="notice">Estás leyendo una versión anterior. <a href="/works/${id}">Leer v${w.published_version}</a>.</div>` : ""}<div class="prose"><h2 class="section-label">Resumen</h2><p class="paper-abstract">${e(v.abstract)}</p>${[
        ["Pregunta y contexto", b.question],
        ["Método", b.method],
        [
          "Resultados o argumento",
          b.results || "Este problema está abierto a contribuciones.",
        ],
        ["Limitaciones", b.limitations],
      ]
        .map(([h, t]) => `<h2>${h}</h2>${textBlock(t)}`)
        .join(
          "",
        )}${b.claims.length ? `<h2>Afirmaciones para discutir</h2>${b.claims.map((c, i) => `<div class="claim" id="claim-${i + 1}"><span class="claim-number">${String(i + 1).padStart(2, "0")}</span><p>${e(c)}</p></div>`).join("")}` : ""}<h2>Referencias</h2>${references(b.references)}<h2>Declaración de uso de IA</h2>${textBlock(b.ai_disclosure)}<h2>Evaluaciones de esta versión</h2>${reviewCards(reviews)}<h2>Una conversación que continúa</h2>${
        edges.length
          ? edges
              .map((x) => {
                const outgoing = x.source_id === id,
                  other = outgoing ? x.target_id : x.source_id,
                  n = outgoing ? x.target_version : x.source_version;
                return `<div class="related-item"><span class="badge ${x.relation === "challenges" ? "response" : ""}">${outgoing ? e(relations[x.relation]) : "Recibe un aporte: " + e(relations[x.relation])}</span><h3><a href="/works/${e(other)}?v=${n}">${e(outgoing ? x.target_title : x.source_title)}</a></h3><p class="muted">v${x.source_version} → v${x.target_version}${x.source_owner === x.target_owner ? " · Mismo responsable de autoría" : ""}</p>${x.target_claim ? `<blockquote>${e(x.target_claim)}</blockquote>` : ""}</div>`;
              })
              .join("")
          : "<p>Este aporte todavía no tiene respuestas enlazadas. Tu perspectiva puede ser la siguiente.</p>"
      }${w.status !== "withdrawn" ? button("Responder con un aporte ↗", `/submit?target=${id}&v=${v.number}`) : ""}${w.kind === "problem" && w.status !== "withdrawn" ? `<h2>Personas que quieren aportar</h2>${collabs.length ? collabs.map((c) => `<div class="related-item"><strong><a href="/people/${e(c.username)}">${e(c.name)}</a></strong><p>${e(c.contribution)}</p></div>`).join("") : "<p>Sé la primera persona en proponer una contribución.</p>"}<form id="collaborate-form" class="panel" data-id="${id}">${area("contribution", "¿Qué puedes aportar?", "", "Tu propuesta aparecerá públicamente con tu nombre.", 3)}<button class="button secondary">Sumarme al problema</button></form>` : ""}</div></article><aside class="article-side"><div class="panel"><p class="eyebrow">ESTE APORTE</p><div class="metadata"><div class="metadata-row"><span>Publicación</span><strong>${w.status === "withdrawn" ? "Retirada" : "Repositorio abierto"}</strong></div><div class="metadata-row"><span>Revisión IA</span><strong>${reviews.length ? "Disponible" : "No ejecutada"}</strong></div><div class="metadata-row"><span>Pares humanos</span><strong>Sin certificación</strong></div><div class="metadata-row"><span>Licencia</span><a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></div>${w.kind === "problem" ? `<div class="metadata-row"><span>Problema</span><strong>${{ open: "Abierto", in_progress: "En progreso", resolved: "Resuelto por su autor" }[w.problem_state]}</strong></div>` : ""}</div><label for="version-select">Historial de versiones</label><select id="version-select" data-id="${id}">${Array.from({ length: w.published_version }, (_, i) => `<option value="${i + 1}" ${i + 1 === v.number ? "selected" : ""}>Versión ${i + 1}</option>`).join("")}</select><div class="form-actions">${button("Leer PDF ↗", `/works/${id}.pdf?v=${v.number}`, "primary small")}${button("Markdown", `/works/${id}.md?v=${v.number}`, "secondary small")}${button("BibTeX", `/works/${id}.bib?v=${v.number}`, "secondary small")}${button("JSON", `/works/${id}.json?v=${v.number}`, "secondary small")}</div><button class="button secondary small" data-copy="${e(`${w.author}. (${v.created_at.slice(0, 4)}). ${v.title} (v${v.number}). Lumbre. ${env.APP_URL}/works/${id}?v=${v.number}`)}">Copiar referencia</button><details><summary>Huella del contenido</summary><code class="code">${v.hash}</code><p class="muted">SHA-256 del título, resumen, tipo, disciplina y cuerpo estructurado. Identifica la versión; no certifica la verdad de sus resultados.</p></details></div>${u?.id === w.owner_id ? `<div class="panel">${button("Preparar nueva versión", `/workspace/${id}`, "secondary small")}${w.kind === "problem" ? `<form id="problem-state-form" data-id="${id}"><label for="state">Estado del problema</label><select id="state" name="state"><option value="open">Abierto</option><option value="in_progress">En progreso</option><option value="resolved">Resuelto por su autor</option></select>${area("note", "Motivo del cambio", "", "Vincula la evidencia que sustenta tu decisión.", 3)}<button class="button secondary small">Actualizar estado</button></form>` : ""}</div>` : ""}${u?.role === "editor" && w.status !== "withdrawn" ? `<details class="panel"><summary>Actuación editorial</summary><form id="withdraw-form" data-id="${id}">${area("note", "Motivo del retiro", "", "El motivo quedará visible en la ficha.", 3)}<button class="button danger small">Retirar publicación</button></form></details>` : ""}</aside></div></div>`,
      u,
      path,
      meta,
    );
  }
  if (path.startsWith("/people/")) {
    const username = path.split("/")[2],
      person = await env.DB.prepare(
        "SELECT name,username FROM users WHERE username=?",
      )
        .bind(username)
        .first<{ name: string; username: string }>();
    if (!person) fail(404, "Perfil no encontrado.");
    const works = (await publicWorks(env)).filter(
      (w) => w.username === username,
    );
    return shell(
      person!.name,
      `<div class="container"><div class="page-heading"><p class="eyebrow">PERFIL DE CONTRIBUCIONES</p><h1 class="section-title">${e(person!.name)}</h1><p class="muted">@${e(username)} · Identidad declarada por su titular</p></div>${cards(works, "Este perfil aún no tiene aportes publicados.")}</div>`,
      u,
      path,
    );
  }
  const pages: Record<string, [string, string]> = {
    "/about": [
      "Una idea enciende la siguiente.",
      `<p>Lumbre nace de una convicción: una buena pregunta puede venir de cualquier persona. El conocimiento avanza cuando sus argumentos, métodos y límites pueden examinarse, discutirse y mejorarse.</p><h2>Nuestra misión</h2><p>Hacer que investigar, publicar y construir sobre el trabajo de otras personas sea abierto, trazable y accesible, incluyendo a quienes investigan fuera de una institución.</p><h2>Nuestra visión</h2><p>Un registro vivo en el que cada aporte conecte preguntas, evidencia y personas. Un artículo puede abrir una objeción, una réplica o un nuevo problema, y cada contribución conserva su crédito.</p><h2>Humanos e IA, con responsabilidad</h2><p>La IA puede ampliar lo que podemos investigar. Quienes publican asumen responsabilidad por sus afirmaciones y explican qué herramientas utilizaron. La evidencia y el método se evalúan por su contenido.</p><h2>Un espacio, dos capas</h2><p>El repositorio conserva trabajos y respuestas. Cuadernos reúne selecciones editoriales sobre temas comunes. La condición de cada trabajo aparece en su ficha.</p>`,
    ],
    "/principles": [
      "Apertura con rigor.",
      `<h2>1. Publicar es dejar un aporte examinable</h2><p>Pedimos una pregunta clara, un método adecuado a la disciplina, resultados o argumentos, límites y referencias. Un problema abierto explicita qué permitiría resolverlo. No exigimos afiliación universitaria.</p><h2>2. La disciplina importa</h2><p>Un argumento jurídico se evalúa por su corpus, jurisdicción, interpretación y contraargumentos. Una investigación empírica necesita datos, diseño y controles adecuados. No aplicamos una única plantilla experimental a todo el conocimiento.</p><h2>3. Cada evaluación tiene un alcance</h2><p>El control inicial detecta campos incompletos. La evaluación de IA produce observaciones metodológicas. La decisión editorial permite publicar en el repositorio. Ninguno de esos pasos equivale por sí mismo a revisión por pares ni acredita la verdad de un resultado.</p><h2>4. La IA se declara</h2><p>Describe herramientas y tareas. No atribuyas experimentos, búsquedas o verificaciones que no ocurrieron. Quien envía el manuscrito responde por su contenido. Las evaluaciones automáticas identifican proveedor, modelo y huella del texto.</p><h2>5. Se responde al argumento</h2><p>Las respuestas enlazan una versión y, cuando es posible, una afirmación concreta. Complementar, cuestionar y replicar son relaciones distintas. Los aportes del mismo responsable no cuentan como revisión independiente.</p><h2>6. Los cambios dejan rastro</h2><p>Las versiones publicadas se conservan. Las correcciones se publican en una nueva versión. Los retiros mantienen una ficha y su motivo. Una evaluación no se transfiere a una versión modificada.</p><h2>7. Libertad de investigación, cuidado de las personas</h2><p>No se admiten plagio, suplantación, datos fabricados, hostigamiento ni divulgación no autorizada de información personal. Estudios con personas o animales deben declarar permisos y resguardos éticos pertinentes. La relevancia se juzga por el aporte, no por conveniencia ideológica.</p><h2>8. Reutilización y preservación</h2><p>Los autores conservan sus derechos y publican el texto bajo CC BY 4.0. Los formatos de lectura y exportación permiten citar una versión concreta. DOI, ISSN e indexación se mostrarán únicamente cuando hayan sido otorgados o verificados.</p>`,
    ],
    "/terms": [
      "Términos de participación.",
      `<p>Versión del 6 de noviembre de 2026. Lumbre es un proyecto experimental de publicación abierta administrado por su cuenta propietaria. Estos términos regulan el uso del repositorio; no sustituyen una revisión jurídica del servicio.</p><h2>Autoría y licencia</h2><p>Quien envía un aporte declara tener los derechos y el consentimiento de sus coautores. Conserva su autoría y concede al público una licencia Creative Commons Atribución 4.0 sobre el texto publicado. Los materiales de terceros conservan sus propias licencias y deben identificarse; no subas información confidencial o datos personales sin autorización.</p><h2>Publicación y evaluación</h2><p>Guardar un borrador no lo publica. El envío queda sujeto a admisibilidad editorial. Las evaluaciones de IA son auxiliares y pueden contener errores. Una publicación de repositorio no es certificación científica ni asesoría profesional. DOI, ISSN y bases de indexación son procesos externos.</p><h2>Conducta e integridad</h2><p>No se permiten suplantación, manipulación de revisiones, datos inventados, plagio, contenido ilegal ni acoso. El equipo puede solicitar cambios o retirar aportes, conservando el registro y motivo cuando sea apropiado. Usa una identidad pública estable; varios perfiles no constituyen revisores independientes.</p><h2>Decisiones y solicitudes</h2><p>Las decisiones editoriales se documentan en el manuscrito. Para plantear una objeción o pedir una corrección puedes crear una revisión enlazada al trabajo. Las solicitudes que incluyan información privada deben gestionarse directamente con la persona administradora por el canal que te haya facilitado; no las publiques como artículos.</p><h2>Disponibilidad</h2><p>El servicio está en su primera etapa. Conserva copias propias y las exportaciones de tus aportes. No se ofrecen garantías de publicación, indexación, recuperación de cuentas por correo ni disponibilidad ininterrumpida.</p>`,
    ],
    "/privacy": [
      "Privacidad y control de tus datos.",
      `<p>Versión del 6 de noviembre de 2026. Esta implementación recoge nombre público, usuario, contraseña cifrada mediante derivación criptográfica, sesiones y contenido que decides aportar. No solicita correo electrónico ni perfil institucional.</p><h2>Qué es público</h2><p>Nombre de autor, usuario, contribuciones publicadas, relaciones entre trabajos y propuestas de colaboración. Los borradores son accesibles a su titular y a la cuenta editorial para gestionar el servicio. No publiques datos privados en una propuesta de colaboración.</p><h2>Infraestructura</h2><p>Cloudflare aloja la aplicación, los registros estructurados y las copias de versiones. Las sesiones usan cookies necesarias, HttpOnly y de duración limitada. El servicio usa la dirección de red para límites temporales; las claves del limitador se guardan como hashes. Los registros técnicos de infraestructura pueden incluir datos de conexión.</p><h2>Evaluaciones de IA</h2><p>Se requiere autorización expresa en el manuscrito antes de enviar su contenido a OpenAI o Anthropic. Solo se envía al solicitar una evaluación. El proveedor procesa el texto según sus condiciones. No incluyas información confidencial. No se reutilizan claves privadas de otros proyectos para estas evaluaciones.</p><h2>Conservación y solicitudes</h2><p>Los borradores se conservan en la cuenta. Las versiones públicas mantienen un historial para preservar citas y atribución; un retiro conserva su ficha. Puedes cambiar tu contraseña y cerrar sesión desde tu cuenta. Para solicitudes privadas de acceso, corrección o eliminación, contacta directamente a la persona administradora por el canal de invitación. El lanzamiento general requiere definir y publicar la identidad formal del responsable y su canal de atención.</p>`,
    ],
  };
  if (pages[path])
    return shell(
      pages[path][0],
      `<div class="container narrow"><div class="page-heading"><p class="eyebrow">LUMBRE / CONOCIMIENTO ABIERTO</p><h1 class="section-title">${pages[path][0]}</h1></div><article class="prose panel">${pages[path][1]}</article></div>`,
      u,
      path,
    );
  return shell(
    "Página no encontrada",
    `<div class="container empty"><h1>Este camino todavía no existe.</h1>${button("Volver al inicio", "/")}</div>`,
    u,
    path,
    "",
    404,
  );
}
