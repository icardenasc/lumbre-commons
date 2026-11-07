-- Rebuild derived machine translations with paragraph context; published originals are unchanged.
UPDATE translations SET status='queued',translated=NULL,progress=0,total=0,lease_until=0,error=NULL,updated_at=datetime('now') WHERE provider='Cloudflare Workers AI · m2m100-1.2b';
