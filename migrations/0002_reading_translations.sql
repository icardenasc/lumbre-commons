CREATE TABLE translations (
 id TEXT PRIMARY KEY,
 work_id TEXT NOT NULL REFERENCES works(id),
 version INTEGER NOT NULL,
 content_hash TEXT NOT NULL,
 source_language TEXT NOT NULL,
 target_language TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','running','ready','failed')),
 provider TEXT NOT NULL,
 payload TEXT NOT NULL,
 translated TEXT,
 progress INTEGER NOT NULL DEFAULT 0,
 total INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0,
 error TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(work_id,version,content_hash,target_language)
);
CREATE INDEX translations_pending ON translations(status,lease_until,created_at);
