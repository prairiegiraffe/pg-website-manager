-- Add no_follow_redirects column to sites table
-- When true, fetch will use redirect: 'manual' to not follow redirects
-- This helps with sites that have redirect loops or issues
ALTER TABLE sites ADD COLUMN no_follow_redirects INTEGER NOT NULL DEFAULT 0;
