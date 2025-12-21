-- Add is_degraded column to checks table for slow but successful responses
ALTER TABLE checks ADD COLUMN is_degraded INTEGER DEFAULT 0;

-- Add slow_threshold_ms to sites table (optional per-site threshold)
ALTER TABLE sites ADD COLUMN slow_threshold_ms INTEGER DEFAULT 3000;
