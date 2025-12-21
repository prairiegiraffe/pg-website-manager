-- Add indexes to speed up check queries
CREATE INDEX IF NOT EXISTS idx_checks_site_checked ON checks(site_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at);
