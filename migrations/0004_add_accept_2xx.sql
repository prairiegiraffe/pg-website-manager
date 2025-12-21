-- Add accept_2xx column to sites table
-- When true, any 2xx status code is considered successful
ALTER TABLE sites ADD COLUMN accept_2xx INTEGER NOT NULL DEFAULT 0;
