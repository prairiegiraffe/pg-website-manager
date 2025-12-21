-- Add error_message column to checks table for better debugging
ALTER TABLE checks ADD COLUMN error_message TEXT;
