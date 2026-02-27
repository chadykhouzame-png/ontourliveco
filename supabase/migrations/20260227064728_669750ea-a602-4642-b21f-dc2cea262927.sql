
-- Add Stripe Connect fields to artists
ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;

-- Add payment tracking to booking_requests
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS payment_intent_id text,
ADD COLUMN IF NOT EXISTS payment_amount integer,
ADD COLUMN IF NOT EXISTS platform_fee integer,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
