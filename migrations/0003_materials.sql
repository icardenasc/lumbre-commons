CREATE TABLE materials(id TEXT PRIMARY KEY,work_id TEXT NOT NULL REFERENCES works(id),owner_id TEXT NOT NULL REFERENCES users(id),filename TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,sha256 TEXT NOT NULL,r2_key TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX materials_work ON materials(work_id);
