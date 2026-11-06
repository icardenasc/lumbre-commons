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
import { journalHome, editorialPages, publicationRow } from "./journal";
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
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} · Lumbre</title><meta name="description" content="Lumbre, revista científica de investigación abierta. Artículos, métodos y debate científico con autoría responsable, fuentes y versiones citables."><link rel="icon" href="/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css"><link rel="alternate" type="application/rss+xml" title="Lumbre · Publicaciones" href="/feed.xml">${meta}<script src="/app.js" defer></script></head><body class="${path === "/" ? "is-home" : "is-inner"}"><a class="sr-only skip-link" href="#main">Saltar al contenido</a><header class="site-header"><div class="container"><div class="utility-bar"><a href="/journal">Revista científica de acceso abierto</a><div><a href="/reading-list">Lista de lectura</a>${u ? `<a href="/workspace">Mi espacio</a>` : '<a href="/login">Entrar</a>'}</div></div><div class="masthead"><a class="brand" href="/" aria-label="Lumbre, inicio">Lumbre<span>·</span></a><p>Conocimiento abierto.<br>Investigación en conversación.</p><a class="button primary small masthead-submit" href="/authors">Publicar en Lumbre ↗</a></div><div class="navigation-bar"><nav class="nav" aria-label="Principal">${[
      ["/explore", "Publicaciones"],
      ["/problems", "Preguntas abiertas"],
      ["/graph", "Conexiones"],
      ["/journal", "La revista"],
      ["/authors", "Para autores"],
      ["/editorial", "Proceso editorial"],
    ]
      .map(
        ([href, label]) =>
          `<a class="nav-link ${path === href ? "active" : ""}" ${path === href ? 'aria-current="page"' : ""} href="${href}">${label}</a>`,
      )
      .join(
        "",
      )}</nav><details class="site-search"><summary aria-label="Buscar en Lumbre"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m15 15 6 6" stroke="currentColor" stroke-width="1.5"/></svg><span>Buscar</span></summary><form action="/explore" method="get"><label for="site-q">Buscar publicaciones</label><div><input id="site-q" name="q" placeholder="Título, pregunta o tema" required><button class="button primary small">Buscar →</button></div></form></details></div></div></header><main id="main">${body}</main><footer class="footer"><div class="container"><div class="footer-top"><div><a class="brand" href="/">Lumbre<span>·</span></a><p>Revista de investigación abierta.<br>El conocimiento merece seguir en discusión.</p></div><div><p class="eyebrow">LA REVISTA</p><a href="/journal">Alcance y propósito</a><a href="/manifesto">Declaración editorial</a><a href="/editorial">Proceso editorial</a><a href="/principles">Integridad y criterios</a></div><div><p class="eyebrow">PARTICIPA</p><a href="/authors">Instrucciones para autores</a><a href="/submit">Enviar un manuscrito</a><a href="/problems">Preguntas abiertas</a><a href="/feed.xml">Seguir publicaciones · RSS</a></div><div><p class="eyebrow">ACCESO ABIERTO</p><a href="/reading-list">Mi lista de lectura</a><a href="/llms.txt">Lectura para agentes</a><a href="https://github.com/icardenasc/lumbre-commons">Código abierto ↗</a>${u ? '<a href="/account">Mi cuenta</a>' : '<a href="/register">Crear cuenta</a>'}</div></div><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} Lumbre · Textos bajo CC BY 4.0</span><div><a href="/terms">Términos</a><a href="/privacy">Privacidad</a></div><span>Edición en apertura · ISSN pendiente</span></div></div></footer><div id="toast" class="toast" role="status" hidden></div></body></html>`,
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
  return `<div class="field full"><label for="${name}">${label}</label>${help ? `<p class="muted">${help}</p>` : ""}<textarea id="${name}" name="${name}" rows="${rows}" maxlength="${({ abstract: 3000, question: 8000, method: 12000, results: 18000, limitations: 6000, references: 10000, ai_disclosure: 2000, funding: 3000, conflicts: 3000, ethics: 3000, data_availability: 3000, claims: 4808 } as Record<string, number>)[name] || 10000}">${e(value)}</textarea></div>`;
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
      : `<details class="full"><summary>¿Quieres responder o complementar un trabajo?</summary><p>Abre su ficha y elige «Enviar una respuesta» para enlazar la versión y sus afirmaciones.</p></details>`
  }${area("question", "Pregunta y contexto", body.question, "Delimita el problema, el estado del conocimiento y el aporte propuesto. En derecho, indica jurisdicción y marco temporal.")}${area("method", "Método o criterio de resolución", body.method, "Describe cómo llegaste al resultado. Para un problema abierto, explica qué contaría como una respuesta satisfactoria.")}${area("results", "Resultados o argumento", body.results, "Expón el análisis, incluyendo evidencia y contraargumentos. Un problema abierto puede dejar este campo vacío.", 8)}${area("limitations", "Limitaciones", body.limitations, "Indica qué no permiten concluir tus datos o tu argumento.", 3)}${area("claims", "Afirmaciones principales", body.claims.join("\n"), "Una por línea, hasta ocho. Otras personas podrán responder a una afirmación concreta.", 4)}${area("references", "Referencias", body.references, "Una referencia por línea. Incluye autor, título, fecha y URL o DOI verificable. Puedes usar APA o Chicago de manera consistente.", 5)}${area("ai_disclosure", "Declaración de uso de IA", body.ai_disclosure, "Indica herramientas, tareas realizadas y comprobaciones humanas. Si no usaste IA, decláralo.", 3)}${area("funding", "Financiación", body.funding || "", "Identifica apoyos y el papel de los financiadores. Si no hubo financiación, decláralo.", 2)}${area("conflicts", "Conflictos de interés", body.conflicts || "", "Declara intereses económicos, profesionales o personales relevantes, o su ausencia.", 2)}${area("ethics", "Consideraciones éticas", body.ethics || "", "Permisos, aprobación ética y consentimiento cuando correspondan. Explica si no aplica.", 3)}${area("data_availability", "Disponibilidad de datos y materiales", body.data_availability || "", "Enlaces a datos, código, corpus o protocolos; condiciones de acceso y restricciones justificadas.", 3)}<label class="check-label full"><input type="checkbox" name="consent" ${body.consent ? "checked" : ""}> Soy responsable del contenido, cuento con derechos para publicarlo y acepto su licencia CC BY 4.0 y los <a href="/terms">términos</a>.</label><label class="check-label full"><input type="checkbox" name="ai_consent" ${body.ai_consent ? "checked" : ""}> Autorizo que este manuscrito se envíe a OpenAI o Anthropic si solicito una evaluación automática. Es opcional y no afecta el envío editorial.</label></div><div id="form-error" class="notice error" role="alert" hidden></div><div class="form-actions"><button class="button primary" type="submit">Guardar borrador</button><span class="muted">Tu borrador es privado hasta su publicación.</span></div></form>`;
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
  if (path === "/")
    return shell(
      "Revista de investigación abierta",
      journalHome(await publicWorks(env)),
      u,
      path,
    );
  if (path === "/about")
    return Response.redirect(new URL("/journal", url.origin).href, 301);
  if (editorialPages[path]) {
    const page = editorialPages[path];
    const headings = [...page.body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
    return shell(
      page.title,
      `<div class="container editorial-page"><header class="editorial-page-head"><p class="eyebrow">${page.eyebrow}</p><h1>${page.title}</h1><p>${page.deck}</p></header><div class="policy-layout"><aside class="policy-toc"><p class="eyebrow">EN ESTA PÁGINA</p>${headings.map((h) => `<a href="#${h[1]}">${h[2]}</a>`).join("")}<a class="text-link" href="/submit">Enviar un manuscrito ↗</a></aside><article class="prose editorial-prose">${page.body}</article></div></div>`,
      u,
      path,
    );
  }
  if (path === "/reading-list")
    return shell(
      "Mi lista de lectura",
      `<div class="container"><div class="page-heading"><p class="eyebrow">BIBLIOTECA PERSONAL</p><h1 class="section-title">Para volver a leer.</h1><p class="hero-copy">Guarda publicaciones desde su ficha y retoma su lectura aquí. Esta lista se conserva únicamente en este navegador.</p></div><div id="reading-list"><p>Activa JavaScript para consultar las publicaciones guardadas en este dispositivo.</p></div><a class="text-link" href="/explore">Explorar publicaciones ↗</a></div>`,
      u,
      path,
      '<meta name="robots" content="noindex">',
    );
  if (["/explore", "/problems"].includes(path)) {
    const kind =
        path === "/problems" ? "problem" : url.searchParams.get("kind") || "",
      q = url.searchParams.get("q") || "",
      field = url.searchParams.get("field") || "";
    let works = await publicWorks(env, q, kind, field);
    const title =
      path === "/problems"
        ? "Lo que todavía no sabemos."
        : "El archivo de Lumbre.";
    return shell(
      title,
      `<div class="container"><div class="page-heading"><p class="eyebrow">${path === "/problems" ? "PREGUNTAS DE INVESTIGACIÓN" : "PUBLICACIONES / ACCESO ABIERTO"}</p><h1 class="section-title">${title}</h1><p class="hero-copy">${path === "/problems" ? "Problemas delimitados, antecedentes y caminos por explorar. Una invitación a investigar en común." : "Artículos, propuestas metodológicas y debate. Cada publicación conserva su autoría, versiones y estado editorial."}</p></div><form class="search-form toolbar" method="get">${kind && path === "/explore" ? `<input type="hidden" name="kind" value="${e(kind)}">` : ""}<label class="sr-only" for="q">Buscar conocimiento</label><input class="search-input" id="q" name="q" value="${e(q)}" placeholder="Buscar por título, pregunta o tema"><label class="sr-only" for="filter-field">Disciplina</label><select id="filter-field" name="field"><option value="">Todas las disciplinas</option>${fields.map((f) => `<option ${field === f ? "selected" : ""}>${f}</option>`).join("")}</select><button class="button secondary">Buscar</button></form>${
        path === "/explore"
          ? `<nav class="tabs" aria-label="Tipo de aporte"><a class="tab ${!kind ? "active" : ""}" href="/explore?${e(new URLSearchParams({ q, field }).toString())}">Todo</a>${Object.entries(
              kinds,
            )
              .map(
                ([k, v]) =>
                  `<a class="tab ${kind === k ? "active" : ""}" href="/explore?${e(new URLSearchParams({ kind: k, q, field }).toString())}">${v}</a>`,
              )
              .join("")}</nav>`
          : ""
      }<div class="section-head"><p class="muted">${works.length} publicaciones${works.length === 100 ? " (primeros 100)" : ""}</p>${button(path === "/problems" ? "Proponer un problema" : "Enviar un manuscrito", path === "/problems" ? "/submit?kind=problem" : "/submit", "secondary small")}</div>${works.length ? `<div class="publication-list">${works.map(publicationRow).join("")}</div>` : `<div class="empty"><h3>No encontramos publicaciones.</h3><p>Prueba otra búsqueda o elimina los filtros.</p><a class="text-link" href="${path}">Ver todas las publicaciones →</a></div>`}</div>`,
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
      `<div class="container auth-layout"><aside class="auth-aside"><p class="eyebrow">LUMBRE / AUTORES Y REVISORES</p><h1 class="section-title">El trabajo empieza<br>con una pregunta.</h1><p class="hero-copy">Prepara tus manuscritos, acompaña su proceso editorial y participa en el debate científico.</p></aside><section class="panel"><h2>${reg ? "Crear una cuenta" : "Entrar a Lumbre"}</h2><form id="auth-form" data-mode="${reg ? "register" : "login"}" data-next="${e(next.startsWith("/") && !next.startsWith("//") ? next : "/workspace")}">${reg ? input("name", "Nombre público", "", "text", true, 'maxlength="80" autocomplete="name"') : ""}${input("username", "Nombre de usuario", "", "text", true, 'minlength="3" maxlength="32" pattern="[a-z0-9][a-z0-9_-]{2,31}" autocomplete="username" autocapitalize="none"')}${input("password", "Contraseña", "", "password", true, `minlength="12" maxlength="128" autocomplete="${reg ? "new-password" : "current-password"}"`)}${reg ? '<p class="muted">Al crear tu cuenta aceptas los <a href="/terms">términos</a> y la <a href="/privacy">política de privacidad</a>. Guarda tu contraseña en un gestor; esta primera versión no recupera cuentas por correo.</p>' : ""}<div id="form-error" class="notice error" role="alert" hidden></div><div class="form-actions"><button class="button primary">${reg ? "Crear cuenta" : "Entrar"}</button></div></form><p class="muted">${reg ? '¿Ya tienes cuenta? <a href="/login">Entrar</a>' : '¿Primera vez? <a href="/register">Crear cuenta</a>'}</p></section></div>`,
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
        `<div class="container"><div class="page-heading"><p class="eyebrow">${editor ? "DECISIONES CON TRAZABILIDAD" : "TU MESA DE TRABAJO"}</p><h1 class="section-title">${editor ? "Mesa editorial." : `Hola, ${e(u.name.split(" ")[0])}.`}</h1><p class="hero-copy">${editor ? "Revisa el manuscrito completo y documenta cada decisión. La admisión editorial y la revisión independiente son decisiones distintas. Documenta los controles realizados." : "Aquí viven tus preguntas, borradores y nuevas versiones."}</p><div class="hero-actions">${button("Nuevo manuscrito", "/submit")}${u.role === "editor" ? button(editor ? "Mi espacio" : "Mesa editorial", editor ? "/workspace" : "/editor", "secondary") : ""}${button("Mi cuenta", "/account", "secondary")}</div></div>${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Aporte</th><th>Estado</th><th>Versión pública</th><th></th></tr></thead><tbody>${rows.map((w) => `<tr><td><strong>${e(w.title)}</strong><br><span class="muted">${e(kinds[w.kind])} · ${e(w.author)}</span></td><td>${e({ draft: "Borrador", submitted: "En revisión editorial", published: "Publicado", withdrawn: "Retirado" }[w.status] || w.status)}</td><td>${w.published_version ? `<a href="/works/${w.id}">v${w.published_version} ↗</a>` : "—"}</td><td><a class="button secondary small" href="/${editor ? "editor" : "workspace"}/${w.id}">${editor ? "Revisar" : "Abrir"}</a></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty"><h3>Un espacio para la siguiente idea.</h3><p>Tus aportes aparecerán aquí.</p></div>'}</div>`,
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
            ["Financiación", b!.funding || "No declarada"],
            ["Conflictos de interés", b!.conflicts || "No declarados"],
            ["Consideraciones éticas", b!.ethics || "No declaradas"],
            ["Datos y materiales", b!.data_availability || "No declarados"],
          ]
            .map(([h, t]) => `<h3>${h}</h3>${textBlock(t)}`)
            .join(
              "",
            )}<h3>Afirmaciones</h3><ol>${b!.claims.map((x) => `<li>${e(x)}</li>`).join("")}</ol></div>`
        : manuscriptForm(w, b, target);
    return shell(
      editor ? "Revisar manuscrito" : id ? "Tu manuscrito" : "Nuevo manuscrito",
      `<div class="container narrow"><div class="page-heading"><p class="eyebrow">${editor ? "MESA EDITORIAL" : "ENVÍO DE MANUSCRITOS"}</p><h1 class="section-title">${editor ? "Leer. Evaluar. Documentar." : id ? "Tu manuscrito." : "Prepara tu manuscrito."}</h1><p class="muted">${editor ? "Verifica fuentes, autoría, método, límites y posibles conflictos antes de decidir." : locked ? "El envío está en revisión editorial. La versión enviada se conserva sin cambios." : "El rigor comienza con una pregunta clara y un método que otros puedan seguir."}</p></div>${w?.editor_note ? `<div class="notice"><strong>Nota editorial</strong><p>${e(w.editor_note)}</p></div>` : ""}${content}${id ? `<section class="panel"><h2>Evaluación metodológica con IA</h2><p>Una lectura adicional del manuscrito. Sus observaciones son separadas de la decisión editorial.</p>${reviewCards(reviewRows)}${env.AI_ENABLED === "true" ? `<div class="form-actions">${env.OPENAI_API_KEY ? `<button class="button secondary" data-ai="openai" data-id="${id}">Evaluar con OpenAI</button>` : ""}${env.ANTHROPIC_API_KEY ? `<button class="button secondary" data-ai="anthropic" data-id="${id}">Evaluar con Anthropic</button>` : ""}</div>` : '<p class="muted">La evaluación automática aún no está activada. Puedes continuar con el envío editorial.</p>'}</section>${editor && w!.status === "submitted" ? `<form id="decision-form" class="panel" data-id="${id}" data-revision="${w!.draft_revision}"><h2>Decisión editorial</h2>${area("note", "Motivación de la decisión", "", "Explica los controles realizados y los cambios necesarios.", 4)}<label class="check-label"><input type="checkbox" name="collection"> Destacar en la selección editorial</label><div class="form-actions"><button class="button primary" name="decision" value="publish">Autorizar publicación</button><button class="button secondary" name="decision" value="return">Solicitar cambios</button></div><p class="muted">Esta decisión no concede sello de revisión por pares ni indexación.</p></form>` : !locked && !editor ? `<div class="panel"><h2>¿Listo para compartir?</h2><p>Guarda tus cambios y envía el manuscrito. El equipo editorial revisará su admisibilidad antes de publicarlo.</p><button class="button primary" data-submit="${id}">Enviar a revisión editorial</button></div>` : ""}` : ""}</div>`,
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
    const meta = `<link rel="canonical" href="${env.APP_URL}/works/${id}"><meta name="citation_title" content="${e(v.title)}"><meta name="citation_author" content="${e(w.author)}"><meta name="citation_publication_date" content="${v.created_at.slice(0, 10).replace(/-/g, "/")}"><meta name="citation_pdf_url" content="${env.APP_URL}/works/${id}.pdf?v=${v.number}"><meta name="citation_language" content="es"><meta name="citation_journal_title" content="Lumbre"><meta name="citation_abstract_html_url" content="${env.APP_URL}/works/${id}?v=${v.number}"><meta property="og:title" content="${e(v.title)}"><meta property="og:description" content="${e(v.abstract.slice(0, 300))}"><meta property="og:type" content="article">${w.status === "withdrawn" ? '<meta name="robots" content="noindex">' : ""}`;
    return shell(
      v.title,
      `<div class="container"><div class="page-heading"><a class="text-link" href="/explore">← Publicaciones</a></div><div class="article-layout"><article class="article-main" id="article-text"><div class="card-top">${tag(w)}<span class="muted">${e(w.field)}</span></div><h1 class="paper-title">${e(v.title)}</h1><div class="card-meta"><span class="avatar">${e(w.author?.slice(0, 1))}</span><a href="/people/${e(w.username)}">${e(w.author)}</a><span>${date(v.created_at)}</span><span>v${v.number}</span></div>${w.status === "withdrawn" ? `<div class="notice error"><strong>Publicación retirada</strong><p>${e(w.editor_note)}</p><p>Se conserva el registro para mantener la trazabilidad.</p></div>` : ""}${v.number < w.published_version ? `<div class="notice">Estás leyendo una versión anterior. <a href="/works/${id}">Leer v${w.published_version}</a>.</div>` : ""}<div class="reading-toolbar"><button class="reader-toggle" id="reader-focus" aria-pressed="false">Modo lectura</button><button class="reader-toggle" id="reader-size" aria-pressed="false" aria-label="Aumentar tamaño de letra">A<span class="large-a">A</span></button><button class="reader-toggle" data-save-id="${e(id)}" data-save-title="${e(v.title)}" data-save-author="${e(w.author)}" aria-pressed="false">Guardar lectura ＋</button><span>${Math.max(1, Math.ceil((v.abstract + " " + b.question + " " + b.method + " " + b.results + " " + b.limitations).split(/\s+/).length / 220))} min de lectura</span><a class="reader-toggle" href="/works/${id}.pdf?v=${v.number}">PDF ↓</a></div><details class="mobile-toc"><summary>Contenido del artículo</summary><nav aria-label="Índice móvil"><a href="#abstract">Resumen</a><a href="#paper-section-0">Pregunta y contexto</a><a href="#paper-section-1">Método</a><a href="#paper-section-2">Resultados o argumento</a><a href="#paper-section-3">Limitaciones</a><a href="#references">Referencias</a><a href="#declarations">Declaraciones</a><a href="#discussion">Correspondencia y debate</a></nav></details><div class="prose article-prose"><h2 class="section-label" id="abstract">Resumen</h2><p class="paper-abstract">${e(v.abstract)}</p>${[
        ["Pregunta y contexto", b.question],
        ["Método", b.method],
        [
          "Resultados o argumento",
          b.results || "Este problema está abierto a contribuciones.",
        ],
        ["Limitaciones", b.limitations],
      ]
        .map(
          ([h, t], i) =>
            `<section id="paper-section-${i}"><h2><span class="section-no">0${i + 1}</span>${h}</h2>${textBlock(t)}</section>`,
        )
        .join(
          "",
        )}${b.claims.length ? `<h2 id="claims">Afirmaciones para discutir</h2>${b.claims.map((c, i) => `<div class="claim" id="claim-${i + 1}"><span class="claim-number">${String(i + 1).padStart(2, "0")}</span><p>${e(c)}</p></div>`).join("")}` : ""}<h2 id="references">Referencias</h2><div class="references-list">${references(b.references)}</div><h2 id="ai-disclosure">Declaración de uso de IA</h2>${textBlock(b.ai_disclosure)}<h2 id="declarations">Declaraciones del trabajo</h2><dl class="editorial-definitions">${[
        ["Financiación", b.funding],
        ["Conflictos de interés", b.conflicts],
        ["Consideraciones éticas", b.ethics],
        ["Datos y materiales", b.data_availability],
      ]
        .map(
          ([label, value]) =>
            `<dt>${label}</dt><dd>${value ? textBlock(value) : "Sin declaración en esta versión."}</dd>`,
        )
        .join(
          "",
        )}</dl><h2 id="assessments">Evaluaciones de esta versión</h2>${reviewCards(reviews)}<h2 id="discussion">Correspondencia y debate</h2>${
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
      }${w.status !== "withdrawn" ? button("Enviar una respuesta ↗", `/submit?target=${id}&v=${v.number}`) : ""}${w.kind === "problem" && w.status !== "withdrawn" ? `<h2>Personas que quieren aportar</h2>${collabs.length ? collabs.map((c) => `<div class="related-item"><strong><a href="/people/${e(c.username)}">${e(c.name)}</a></strong><p>${e(c.contribution)}</p></div>`).join("") : "<p>Sé la primera persona en proponer una contribución.</p>"}<form id="collaborate-form" class="panel" data-id="${id}">${area("contribution", "¿Qué puedes aportar?", "", "Tu propuesta aparecerá públicamente con tu nombre.", 3)}<button class="button secondary">Sumarme al problema</button></form>` : ""}</div></article><aside class="article-side"><nav class="article-toc" aria-label="Índice del artículo"><p class="eyebrow">CONTENIDO</p><a href="#abstract">Resumen</a><a href="#paper-section-0">Pregunta y contexto</a><a href="#paper-section-1">Método</a><a href="#paper-section-2">Resultados o argumento</a><a href="#paper-section-3">Limitaciones</a>${b.claims.length ? `<a href="#claims">Afirmaciones</a>` : ""}<a href="#references">Referencias</a><a href="#ai-disclosure">Uso de IA</a><a href="#declarations">Declaraciones</a><a href="#assessments">Evaluaciones</a><a href="#discussion">Correspondencia</a></nav><div class="panel article-record"><p class="eyebrow">REGISTRO DE PUBLICACIÓN</p><div class="metadata"><div class="metadata-row"><span>Publicación</span><strong>${w.status === "withdrawn" ? "Retirada" : "Admisión editorial"}</strong></div><div class="metadata-row"><span>Revisión IA</span><strong>${reviews.length ? "Disponible" : "No ejecutada"}</strong></div><div class="metadata-row"><span>Revisión independiente</span><strong>No acreditada</strong></div><div class="metadata-row"><span>Licencia</span><a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></div>${w.kind === "problem" ? `<div class="metadata-row"><span>Problema</span><strong>${{ open: "Abierto", in_progress: "En progreso", resolved: "Resuelto por su autor" }[w.problem_state]}</strong></div>` : ""}</div><label for="version-select">Historial de versiones</label><select id="version-select" data-id="${id}">${Array.from({ length: w.published_version }, (_, i) => `<option value="${i + 1}" ${i + 1 === v.number ? "selected" : ""}>Versión ${i + 1}</option>`).join("")}</select><div class="form-actions">${button("Leer PDF ↗", `/works/${id}.pdf?v=${v.number}`, "primary small")}${button("Markdown", `/works/${id}.md?v=${v.number}`, "secondary small")}${button("BibTeX", `/works/${id}.bib?v=${v.number}`, "secondary small")}${button("RIS", `/works/${id}.ris?v=${v.number}`, "secondary small")}${button("JSON", `/works/${id}.json?v=${v.number}`, "secondary small")}</div><button class="button secondary small" data-copy="${e(`${w.author}. (${v.created_at.slice(0, 4)}). ${v.title} (v${v.number}). Lumbre. ${env.APP_URL}/works/${id}?v=${v.number}`)}">Copiar referencia</button><details><summary>Huella del contenido</summary><code class="code">${v.hash}</code><p class="muted">SHA-256 del título, resumen, tipo, disciplina y cuerpo estructurado. Identifica la versión; no certifica la verdad de sus resultados.</p></details></div>${u?.id === w.owner_id ? `<div class="panel">${button("Preparar nueva versión", `/workspace/${id}`, "secondary small")}${w.kind === "problem" ? `<form id="problem-state-form" data-id="${id}"><label for="state">Estado del problema</label><select id="state" name="state"><option value="open">Abierto</option><option value="in_progress">En progreso</option><option value="resolved">Resuelto por su autor</option></select>${area("note", "Motivo del cambio", "", "Vincula la evidencia que sustenta tu decisión.", 3)}<button class="button secondary small">Actualizar estado</button></form>` : ""}</div>` : ""}${u?.role === "editor" && w.status !== "withdrawn" ? `<details class="panel"><summary>Actuación editorial</summary><form id="withdraw-form" data-id="${id}">${area("note", "Motivo del retiro", "", "El motivo quedará visible en la ficha.", 3)}<button class="button danger small">Retirar publicación</button></form></details>` : ""}</aside></div></div>`,
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
    "/principles": [
      "Apertura con rigor.",
      `<h2>1. Publicar es dejar un aporte examinable</h2><p>Pedimos una pregunta clara, un método adecuado a la disciplina, resultados o argumentos, límites y referencias. Un problema abierto explicita qué permitiría resolverlo. No exigimos afiliación universitaria.</p><h2>2. La disciplina importa</h2><p>Un argumento jurídico se evalúa por su corpus, jurisdicción, interpretación y contraargumentos. Una investigación empírica necesita datos, diseño y controles adecuados. No aplicamos una única plantilla experimental a todo el conocimiento.</p><h2>3. Cada evaluación tiene un alcance</h2><p>El control inicial detecta campos incompletos. La evaluación de IA produce observaciones metodológicas. La decisión editorial permite autorizar la publicación. Ninguno de esos pasos equivale por sí mismo a revisión por pares ni acredita la verdad de un resultado.</p><h2>4. La IA se declara</h2><p>Describe herramientas y tareas. No atribuyas experimentos, búsquedas o verificaciones que no ocurrieron. Quien envía el manuscrito responde por su contenido. Las evaluaciones automáticas identifican proveedor, modelo y huella del texto.</p><h2>5. Se responde al argumento</h2><p>Las respuestas enlazan una versión y, cuando es posible, una afirmación concreta. Complementar, cuestionar y replicar son relaciones distintas. Los aportes del mismo responsable no cuentan como revisión independiente.</p><h2>6. Los cambios dejan rastro</h2><p>Las versiones publicadas se conservan. Las correcciones se publican en una nueva versión. Los retiros mantienen una ficha y su motivo. Una evaluación no se transfiere a una versión modificada.</p><h2>7. Libertad de investigación, cuidado de las personas</h2><p>No se admiten plagio, suplantación, datos fabricados, hostigamiento ni divulgación no autorizada de información personal. Estudios con personas o animales deben declarar permisos y resguardos éticos pertinentes. La relevancia se juzga por el aporte, no por conveniencia ideológica.</p><h2>8. Reutilización y preservación</h2><p>Los autores conservan sus derechos y publican el texto bajo CC BY 4.0. Los formatos de lectura y exportación permiten citar una versión concreta. DOI, ISSN e indexación se mostrarán únicamente cuando hayan sido otorgados o verificados.</p>`,
    ],
    "/terms": [
      "Términos de participación.",
      `<p>Versión del 6 de noviembre de 2026. Lumbre es un proyecto experimental de publicación abierta administrado por su cuenta propietaria. Estos términos regulan el uso de la revista; no sustituyen una revisión jurídica del servicio.</p><h2>Autoría y licencia</h2><p>Quien envía un aporte declara tener los derechos y el consentimiento de sus coautores. Conserva su autoría y concede al público una licencia Creative Commons Atribución 4.0 sobre el texto publicado. Los materiales de terceros conservan sus propias licencias y deben identificarse; no subas información confidencial o datos personales sin autorización.</p><h2>Publicación y evaluación</h2><p>Guardar un borrador no lo publica. El envío queda sujeto a admisibilidad editorial. Las evaluaciones de IA son auxiliares y pueden contener errores. La publicación de un manuscrito no es certificación científica ni asesoría profesional. DOI, ISSN y bases de indexación son procesos externos.</p><h2>Conducta e integridad</h2><p>No se permiten suplantación, manipulación de revisiones, datos inventados, plagio, contenido ilegal ni acoso. El equipo puede solicitar cambios o retirar aportes, conservando el registro y motivo cuando sea apropiado. Usa una identidad pública estable; varios perfiles no constituyen revisores independientes.</p><h2>Decisiones y solicitudes</h2><p>Las decisiones editoriales se documentan en el manuscrito. Para plantear una objeción o pedir una corrección puedes crear una revisión enlazada al trabajo. Las solicitudes que incluyan información privada deben gestionarse directamente con la persona administradora por el canal que te haya facilitado; no las publiques como artículos.</p><h2>Disponibilidad</h2><p>El servicio está en su primera etapa. Conserva copias propias y las exportaciones de tus aportes. No se ofrecen garantías de publicación, indexación, recuperación de cuentas por correo ni disponibilidad ininterrumpida.</p>`,
    ],
    "/privacy": [
      "Privacidad y control de tus datos.",
      `<p>Versión del 6 de noviembre de 2026. Esta implementación recoge nombre público, usuario, contraseña cifrada mediante derivación criptográfica, sesiones y contenido que decides aportar. No solicita correo electrónico ni perfil institucional.</p><h2>Qué es público</h2><p>Nombre de autor, usuario, contribuciones publicadas, relaciones entre trabajos y propuestas de colaboración. Los borradores son accesibles a su titular y a la cuenta editorial para gestionar el servicio. No publiques datos privados en una propuesta de colaboración.</p><h2>Lista de lectura</h2><p>Si guardas una publicación, su título, autor y enlace se conservan en el almacenamiento local de este navegador. La lista no se sincroniza con tu cuenta ni se envía al servidor. Puedes quitar cada entrada desde la lista de lectura o borrar los datos locales del sitio.</p><h2>Infraestructura</h2><p>Cloudflare aloja la aplicación, los registros estructurados y las copias de versiones. Las sesiones usan cookies necesarias, HttpOnly y de duración limitada. El servicio usa la dirección de red para límites temporales; las claves del limitador se guardan como hashes. Los registros técnicos de infraestructura pueden incluir datos de conexión.</p><h2>Evaluaciones de IA</h2><p>Se requiere autorización expresa en el manuscrito antes de enviar su contenido a OpenAI o Anthropic. Solo se envía al solicitar una evaluación. El proveedor procesa el texto según sus condiciones. No incluyas información confidencial. No se reutilizan claves privadas de otros proyectos para estas evaluaciones.</p><h2>Conservación y solicitudes</h2><p>Los borradores se conservan en la cuenta. Las versiones públicas mantienen un historial para preservar citas y atribución; un retiro conserva su ficha. Puedes cambiar tu contraseña y cerrar sesión desde tu cuenta. Para solicitudes privadas de acceso, corrección o eliminación, contacta directamente a la persona administradora por el canal de invitación. El lanzamiento general requiere definir y publicar la identidad formal del responsable y su canal de atención.</p>`,
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
