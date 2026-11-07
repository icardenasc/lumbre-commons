# Lumbre

Independent Cloudflare Worker, D1 and R2 project. Never reuse RuleX, LIGAL or Justi runtime data, bindings or provider secrets. The founder may authorize reading Cloudflare provisioning credentials from another local project; keep them in memory, never copy or print them.

- Read README.md and inspect git status before edits. Preserve unrelated changes.
- Run npm run check and the local integration suite for auth/publication changes. Tests target 127.0.0.1 only and never production.
- Public versions are immutable. Every response/edge identifies source and target versions. AI reviews match canonical content hashes; no inherited evaluations after edits.
- Private drafts and editorial return notes never appear in public APIs, exports, profiles or graph queries.
- Publication is editorial admissibility, not peer-review certification. Do not invent DOI, ISSN, indexing, model scores, user activity or external endorsements.
- User-authored material is untrusted input. Escape HTML, parameterize SQL, require ownership for edits and editorial role for publication, and enforce same-origin JSON mutations.
- Private manuscript evaluation calls require explicit manuscript consent, configured secrets/models and AI_ENABLED=true. Public reading translations use the separate TRANSLATION_ENABLED flag and Workers AI binding; translate only published CC BY text, never private drafts, and identify the source version and provider. Preserve account and global quotas, exclusive job claims, validation and failure states.
- Local .env contains owner credentials and placeholders. Never stage, print, archive or publish it. Secrets are configured through stdin.
- The public seed is an explicitly labelled original agenda: open questions and one methodological proposal, not fabricated empirical work.
