-- Add first_name, last_name, review_status, and tiktok_url to venues table
ALTER TABLE public.venues
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN review_status text NOT NULL DEFAULT 'pending',
ADD COLUMN tiktok_url text;