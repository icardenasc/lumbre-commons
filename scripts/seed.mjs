// Original editorial agenda. These are proposals, not fabricated scientific findings.
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
const refs =
  "Octopus. Author guide. https://www.octopus.ac/author-guide\nCrossref. Relationships between research objects. https://www.crossref.org/documentation/schema-library/markup-guide-metadata-segments/relationships/\nGoogle Scholar. Inclusion guidelines. https://scholar.google.com/intl/en/scholar/inclusion.html";
const disclosure =
  "Propuesta inicial redactada con asistencia de IA para diseñar la agenda de Lumbre. No presenta datos empíricos, experimentos ejecutados ni revisión independiente. Sus afirmaciones son decisiones de diseño abiertas a discusión.";
const common = {
  ai_disclosure: disclosure,
  license: "CC-BY-4.0",
  consent: true,
  ai_consent: false,
};
const works = [
  {
    id: "respuestas-academicas-trazables",
    kind: "problem",
    field: "Interdisciplinario",
    title:
      "¿Cómo hacer que una respuesta académica sea tan citable como el artículo original?",
    abstract:
      "Una objeción puede cambiar la lectura de un artículo y aun así quedar enterrada en comentarios. Este problema propone estudiar un formato que preserve autoría, evidencia y la versión exacta a la que se responde.",
    body: {
      ...common,
      question:
        "Los comentarios, artículos de respuesta y correcciones viven en espacios distintos. Nos interesa definir una unidad de respuesta que conecte una afirmación concreta con un argumento examinable, sin confundir desacuerdo con refutación. ¿Qué información mínima permite reutilizar esa respuesta fuera de la plataforma que la alojó?",
      method:
        "Se propone comparar ejemplos de respuestas, réplicas y revisiones abiertas; diseñar un esquema de metadatos; y pedir a lectores que reconstruyan qué se cuestiona, quién lo hace y con qué evidencia. Una respuesta satisfactoria incluiría especificación abierta, ejemplos y un protocolo de evaluación de comprensión.",
      results: "",
      limitations:
        "Es una pregunta de investigación y diseño. No se ha ejecutado una evaluación con participantes ni se afirma que el esquema propuesto mejore la comprensión. El reconocimiento académico depende de prácticas institucionales que una plataforma no controla.",
      references: refs,
      claims: [
        "Una respuesta debe identificar la versión del trabajo al que se refiere.",
        "Un enlace de cuestionamiento debe distinguirse de una refutación verificada.",
      ],
    },
  },
  {
    id: "protocolo-aportes-conectados",
    kind: "article",
    field: "Interdisciplinario",
    title: "Un protocolo mínimo para aportes que se conectan",
    abstract:
      "Propuesta metodológica inicial: tratar las respuestas como contribuciones versionadas, con atribución, evidencia y una relación explícita. El objetivo es hacer legible el recorrido de una idea sin reducirlo a un puntaje.",
    body: {
      ...common,
      question:
        "Un repositorio permite encontrar trabajos, pero no siempre reconstruir por qué cambiaron sus conclusiones. Esta propuesta define una estructura inicial para mantener visibles las relaciones entre preguntas, artículos y respuestas. Es un documento de diseño; no reporta un estudio empírico.",
      method:
        "Cada aporte se identifica con un ID estable y versiones inmutables. La relación registra origen, destino, versiones, responsable y tipo: complementa, cuestiona, replica, aporta evidencia, responde, revisa o aborda. Una afirmación textual puede servir de ancla. Las relaciones describen lo declarado por su autor; una evaluación posterior puede examinar su fundamento. Se propone contrastar este esquema con casos reales antes de ampliarlo.",
      results:
        "El protocolo propuesto consta de cuatro pasos. Primero, el autor formula una pregunta, explica su método y presenta límites. Segundo, declara hasta ocho afirmaciones para facilitar una discusión precisa. Tercero, quien responde selecciona la versión y, opcionalmente, una afirmación. Cuarto, la plataforma conserva el enlace bidireccional y publica una nueva versión cuando el autor modifica el contenido. Las evaluaciones de IA se asocian al hash del manuscrito y no se transfieren automáticamente a una versión posterior. Esta especificación es el resultado conceptual del diseño, no evidencia de su eficacia.",
      limitations:
        "El modelo aún necesita evaluación de usabilidad y de precisión semántica. El texto de una afirmación puede ser ambiguo; un hash prueba identidad del contenido, no verdad. La atribución de usuarios no garantiza identidad verificada ni independencia entre personas. Las relaciones no sustituyen revisión especializada.",
      references: refs,
      claims: [
        "Las versiones públicas deben conservarse para que las respuestas mantengan su contexto.",
        "Una evaluación de IA debe asociarse al contenido exacto que evaluó.",
        "La relación «cuestiona» registra una objeción atribuida, no una decisión automática sobre verdad.",
      ],
      target_id: "respuestas-academicas-trazables",
      target_version: 1,
      relation: "addresses",
      target_claim:
        "Una respuesta debe identificar la versión del trabajo al que se refiere.",
    },
  },
  {
    id: "evaluacion-ia-metodo-juridico",
    kind: "problem",
    field: "Derecho y sociedad",
    title:
      "¿Puede una rúbrica de IA reconocer el rigor de un argumento jurídico?",
    abstract:
      "Diseñar una evaluación que atienda fuentes, jurisdicción, interpretación y contraargumentos, sin exigir a un estudio doctrinal la metodología de un experimento. Se buscan aportes desde derecho, epistemología y evaluación de modelos.",
    body: {
      ...common,
      question:
        "Una evaluación uniforme podría premiar la apariencia técnica y pasar por alto la calidad del razonamiento jurídico. El problema consiste en formular criterios observables que distingan fuentes pertinentes, interpretación, alcance temporal y respuesta a contraargumentos, y en medir si una IA los aplica de manera consistente.",
      method:
        "Se propone construir un corpus de ejemplos con permisos adecuados, definir una rúbrica con juristas, obtener evaluaciones humanas independientes y comparar las observaciones de varios modelos. Deben incluirse errores deliberados de jurisdicción, referencias inexistentes y argumentos novedosos pero fundamentados. El criterio de resolución incluiría datos públicos o reproducibles, acuerdo entre evaluadores y análisis de falsos positivos.",
      results: "",
      limitations:
        "No se ha construido el corpus ni ejecutado el benchmark. La calidad jurídica depende de contexto y tradiciones interpretativas. Un modelo que detecte errores en una muestra no adquiere autoridad para rechazar automáticamente investigación.",
      references:
        "Qeios. Publishing policy. https://www.qeios.com/publishing-policy\nOctopus. Author guide. https://www.octopus.ac/author-guide",
      claims: [
        "La evaluación debe adaptarse a la disciplina y al tipo de aporte.",
        "La detección automática de problemas debe poder ser discutida y corregida.",
      ],
      target_id: "protocolo-aportes-conectados",
      target_version: 1,
      relation: "extends",
    },
  },
  {
    id: "reproducibilidad-asistida-ia",
    kind: "problem",
    field: "Inteligencia artificial",
    title:
      "¿Qué debe guardar una investigación para que otra persona pueda reproducirla con IA?",
    abstract:
      "Una conversación con un modelo no basta para reconstruir un resultado. Este problema invita a definir un paquete mínimo de datos, código, versiones, instrucciones y decisiones humanas que permita intentar una reproducción.",
    body: {
      ...common,
      question:
        "El uso de IA puede acelerar análisis, programación y redacción, pero también hace difícil reconstruir decisiones. ¿Qué debe registrarse para distinguir el resultado observado de una explicación producida a posteriori, y permitir que otra persona intente reproducir el proceso sin acceso a la cuenta original?",
      method:
        "Se propone seleccionar tareas computacionales pequeñas, documentar sus entradas, versiones de código, modelo y parámetros, y comparar intentos de reproducción independientes. Deben separarse determinismo de código, variabilidad de modelos y disponibilidad de datos. El criterio de éxito será un paquete abierto acompañado por un informe de reproducción que incluya fallos, no solo ejecuciones exitosas.",
      results: "",
      limitations:
        "No se promete reproducibilidad exacta de modelos alojados por terceros. Sus versiones pueden cambiar, las semillas pueden no fijar todos los resultados y los datos pueden tener restricciones de licencia. Esta pregunta no presupone que guardar una conversación sea suficiente.",
      references:
        "Center for Open Science. Open Science Framework. https://www.cos.io/products/osf\nZenodo. About. https://about.zenodo.org/\nOctopus. Author guide. https://www.octopus.ac/author-guide",
      claims: [
        "Un paquete de reproducción debe distinguir datos observados de texto generado.",
        "La disponibilidad de un archivo no demuestra que alguien haya reproducido el resultado.",
      ],
      target_id: "protocolo-aportes-conectados",
      target_version: 1,
      relation: "extends",
    },
  },
];
const quote = (x) => "'" + String(x).replaceAll("'", "''") + "'";
mkdirSync(".wrangler/seed", { recursive: true });
let sql =
  "INSERT OR IGNORE INTO users(id,username,name,password_hash,salt,role) VALUES('lumbre-agenda','lumbre-agenda','Lumbre · agenda de investigación','disabled','disabled','author');\n";
for (const w of works) {
  const body = JSON.stringify(w.body),
    canonical = JSON.stringify({
      title: w.title,
      abstract: w.abstract,
      kind: w.kind,
      field: w.field,
      body: w.body,
    }),
    hash = createHash("sha256").update(canonical).digest("hex"),
    key = `works/${w.id}/v1-${hash}.json`;
  sql += `INSERT OR IGNORE INTO works(id,owner_id,kind,status,title,abstract,field,body,published_version,collection) VALUES(${[w.id, "lumbre-agenda", w.kind, "published", w.title, w.abstract, w.field, body].map(quote).join(",")},1,${w.kind === "article" ? quote("cuadernos") : "NULL"});\n`;
  sql += `INSERT OR IGNORE INTO versions(id,work_id,number,title,abstract,body,hash,r2_key) VALUES(${quote(w.id + "-v1")},${quote(w.id)},1,${[w.title, w.abstract, body, hash, key].map(quote).join(",")});\n`;
  if (w.body.target_id)
    sql += `INSERT OR IGNORE INTO edges(id,source_id,source_version,target_id,target_version,relation,target_claim) VALUES(${quote(w.id + "-edge")},${quote(w.id)},1,${quote(w.body.target_id)},1,${quote(w.body.relation)},${w.body.target_claim ? quote(w.body.target_claim) : "NULL"});\n`;
  writeFileSync(
    `.wrangler/seed/${w.id}.json`,
    JSON.stringify({
      work: {
        id: w.id,
        kind: w.kind,
        field: w.field,
        author: "Lumbre · agenda de investigación",
      },
      version: 1,
      title: w.title,
      abstract: w.abstract,
      body: w.body,
      hash,
    }),
  );
  w.r2_key = key;
}
writeFileSync(".wrangler/seed/seed.sql", sql);
writeFileSync(
  ".wrangler/seed/manifest.json",
  JSON.stringify(works.map((w) => ({ id: w.id, key: w.r2_key }))),
);
console.log(
  "Prepared original editorial agenda: 3 open problems and 1 methodological proposal.",
);
