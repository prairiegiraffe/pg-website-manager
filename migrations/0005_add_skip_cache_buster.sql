-- Add skip_cache_buster column to sites table
-- When true, the cache-busting query param will not be added to requests
ALTER TABLE sites ADD COLUMN skip_cache_buster INTEGER NOT NULL DEFAULT 0;
