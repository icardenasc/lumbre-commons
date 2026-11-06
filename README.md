# Lumbre

**Una idea enciende la siguiente.** Repositorio abierto de investigación, respuestas citables y problemas colaborativos. Primera versión funcional, con infraestructura independiente en Cloudflare.

- Sitio: https://lumbre-commons.ia-cardenas10.workers.dev
- Código: https://github.com/icardenasc/lumbre-commons
- Licencia del software: MIT. Textos publicados: CC BY 4.0. Fuentes DejaVu: licencia propia incluida.

## Qué funciona

- Registro, login, sesiones HttpOnly, cambio de contraseña y cuenta editorial.
- Borradores privados con edición optimista; envío, devolución motivada y publicación editorial.
- Versiones públicas inmutables, huella SHA-256 y copia de cada publicación en R2.
- Artículos, problemas, respuestas y revisiones abiertas; vínculos a trabajo, versión y afirmación concretos.
- Relaciones bidireccionales: complementa, cuestiona, replica, apoya, responde, revisa y aborda.
- Banco de problemas, propuestas públicas de colaboración y estado declarado por su autor.
- Grafo navegable de conexiones explícitas, búsqueda por texto, filtro por disciplina/tipo.
- Lectura HTML generada en servidor, PDF, Markdown, JSON y BibTeX por versión.
- Colección editorial «Cuadernos», políticas, metadatos bibliográficos, sitemap y llms.txt.
- Adaptadores OpenAI Responses y Anthropic Messages, rúbrica validada, estados de error y consentimiento. **Desactivados hasta configurar claves y modelos. No se ejecutaron llamadas pagadas.**

El contenido inicial es una agenda original identificada como tal: tres problemas abiertos y una propuesta metodológica asistida por IA. No son hallazgos empíricos ni actividad simulada de usuarios.

## Arquitectura

Worker TypeScript con HTML del servidor y JavaScript progresivo, sin framework frontend. `src/worker.ts` contiene HTTP/API y controles; `src/auth.ts` autenticación; `src/model.ts` validación; `src/ai.ts` evaluaciones; `src/exports.ts` formatos; `src/views.ts` páginas. `public/` contiene JS, CSS y fuentes. D1 guarda usuarios, sesiones, trabajos, versiones, relaciones, colaboradores, evaluaciones y auditoría. R2 conserva snapshots JSON de publicaciones. El grafo se representa con tablas relacionales; no requiere otra base para esta escala.

Recursos dedicados: Worker `lumbre-commons`; D1 `lumbre-commons`; R2 `lumbre-commons-artifacts`. Ningún binding comparte datos con RuleX, LIGAL o Justi.

## Desarrollo

Node 22 o superior. Instala dependencias con `npm ci`. En entornos que controlen scripts de instalación, autoriza los scripts oficiales de esbuild/workerd según su gestor.

```sh
npm run db:local
node scripts/seed.mjs
npx wrangler d1 execute lumbre-commons --local --file .wrangler/seed/seed.sql
npm run dev
```

En otra terminal:

```sh
npm run check
npm test
```

La suite usa solamente `http://127.0.0.1:8787`. Crea dos cuentas locales y eleva una en la D1 local para verificar autorización. No ejecutar contra producción. Las pruebas pueden dejar contenido local de QA; no se usa para la siembra remota.

## Despliegue

La cuenta de Cloudflare se autoriza con `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`. Alternativamente `CLOUDFLARE_ENV_SOURCE` apunta a un archivo autorizado que contenga esas dos variables; `scripts/cloudflare.mjs` solo lee esos nombres en memoria y no copia secretos.

```sh
node scripts/cloudflare.mjs provision
node scripts/cloudflare.mjs d1 migrations apply lumbre-commons --remote
node scripts/seed.mjs
node scripts/cloudflare.mjs d1 execute lumbre-commons --remote --file .wrangler/seed/seed.sql
node scripts/seed-storage.mjs
node scripts/cloudflare.mjs deploy
```

La siembra es idempotente y solo añade la agenda inicial. No modifica datos de usuarios existentes.

## Acceso del propietario

En la instalación del fundador, `.env` (ignorado por Git, permisos 0600) contiene `OWNER_USERNAME` y `OWNER_PASSWORD`, además de variables pendientes. La contraseña no está en GitHub ni en archivos de entrega. Inicia sesión y accede a `/editor`. Cámbiala desde `/account` si lo deseas.

Para una instalación nueva: `node scripts/prepare-owner.mjs` crea credenciales locales y configura `OWNER_SETUP_TOKEN` por stdin; después del despliegue, `node scripts/activate-owner.mjs` crea la cuenta y reclama una única titularidad editorial. La sesión de configuración se cierra. El secreto no permite reclamar una segunda cuenta. No ejecutes estos scripts para reemplazar propietarios existentes.

## Activar IA

1. Añade claves propias en los secretos del Worker, nunca en `public/` ni variables públicas.
2. Configura los IDs exactos disponibles para tu cuenta: `OPENAI_MODEL` y `ANTHROPIC_MODEL` en `wrangler.json`.
3. El adaptador OpenAI usa Responses, `store:false`, salida JSON Schema, esfuerzo high y 7.000 tokens máximos. El modelo inicial configurado es `gpt-6-astra`; su acceso debe comprobarse con tu cuenta.
4. El adaptador Anthropic usa Messages, respuesta JSON validada, 7.000 tokens máximos; `ANTHROPIC_MODEL` queda configurado como `claude-opus-5-5`, solicitado por el fundador y verificado en la documentación oficial; su acceso debe comprobarse con tu cuenta.
5. Cambia `AI_ENABLED` a `true` y despliega. El autor debe guardar el consentimiento y pulsar la evaluación deseada.

```sh
node scripts/cloudflare.mjs secret put OPENAI_API_KEY
node scripts/cloudflare.mjs secret put ANTHROPIC_API_KEY
node scripts/cloudflare.mjs deploy
```

No hay claves de proveedores reutilizadas de otros proyectos. Límites iniciales: 3 solicitudes por usuario/día, 20 globales/día, 65.000 caracteres por manuscrito y 90 segundos por proveedor. No son un presupuesto monetario: configura también límites de gasto en las cuentas de los proveedores. El resultado no publica automáticamente ni acredita revisión por pares. Los manuscritos no se ejecutan como instrucciones. Las revisiones se ligan al hash canónico y cada contenido/proveedor admite una ejecución simultánea.

Fuentes de integración: https://developers.openai.com/api/docs/guides/structured-outputs y https://platform.claude.com/docs/en/api/messages y https://platform.claude.com/docs/en/models/opus-5-5/overview

## Seguridad y estados

- Scrypt para contraseñas (N=16384, r=8, p=5); sesiones aleatorias de 256 bits almacenadas por hash, siete días de duración.
- Cookies Secure en HTTPS, HttpOnly y SameSite Strict; mutaciones JSON del mismo origen.
- Consultas parametrizadas y comprobaciones de propietario/rol en servidor; D1 no tiene RLS.
- Límite de tamaño de solicitudes de 100 KB, cuotas de registro/login/creación/IA/PDF.
- HTML escapado, CSP, HSTS, nosniff y bloqueo de iframes.
- El borrador puede cambiar mientras se conserva la última versión pública. Los lectores siempre reciben los campos de la versión pública y nunca la nota de devolución de un borrador.
- Los retiros conservan versiones y motivo. Las conexiones a trabajos retirados salen del grafo y listados; el registro permanece accesible.

## API de lectura y formatos

`GET /api/works?q=&kind=&field=` lista hasta 100 aportes públicos.
`GET /api/works/{id}?v=N` devuelve versión, relaciones, colaboraciones y evaluaciones correspondientes.
`GET /api/graph` devuelve hasta 100 nodos y 500 relaciones visibles.
`GET /works/{id}.{md,json,bib,pdf}?v=N` fija formato y versión.
`GET /llms.txt`, `/sitemap.xml` y `/robots.txt` describen el contenido público.

## Límites de esta entrega

- La revisión de IA está implementada pero no validada de extremo a extremo con claves reales. No existe todavía cola durable para tareas de horas, OCR, carga de PDF/DOCX, editor LaTeX ni ejecución de experimentos.
- El grafo es de conexiones declaradas. No hay embeddings, búsqueda semántica, extracción automática de afirmaciones ni inferencias validadas.
- Identidad pública declarada, sin ORCID/OAuth ni recuperación por correo. No se certifica independencia entre cuentas o titulación. Alta editorial adicional requiere una actuación administrativa explícita.
- «Cuadernos» es una colección; no se presenta como revista indexada. DOI, ISSN, Crossref y OAI-PMH no están activados. Variables Crossref/ISSN son reservas de configuración para trabajo futuro, no integraciones implementadas.
- PDF conserva texto y paginación con fuentes Unicode. Si un carácter no está soportado, devuelve error en lugar de cambiar el contenido silenciosamente. No maquetación de fórmulas LaTeX, tablas complejas ni gráficos.
- Búsqueda/listados limitados a 100 registros, grafo máximo 500 conexiones; paginación, FTS y clustering son siguientes mejoras.
- R2 es una copia operacional, no un programa certificado de preservación. Faltan backups externos periódicos, restauración ensayada y políticas operativas de retención/purga.
- Antes de una convocatoria masiva, define entidad responsable/canal privado de datos, procedimiento de apelación, moderadores y modelo de sostenibilidad. Las políticas incluidas son borradores operativos, no una certificación jurídica.
