-- 2026-11-07: the DevTools platform (devtools.prairiegiraffe.com) keeps this list in step with its clients
-- and reads the results back (devtools-platform src/lib/uptime.ts). The monitor itself ignores these.
--   platform_project_id: the client project this site belongs to (added by the platform for every client with a website)
--   off_reason: why is_active = 0. 'paused' = Kellee paused it (stays off); 'left' = the platform switched it off
--               because the client/site left (switched back on if they return); NULL = switched off by hand here.
ALTER TABLE sites ADD COLUMN platform_project_id INTEGER;
ALTER TABLE sites ADD COLUMN off_reason TEXT;
