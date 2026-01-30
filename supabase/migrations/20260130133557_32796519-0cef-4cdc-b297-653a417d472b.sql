-- Add counter_offer column to booking_requests for negotiation
ALTER TABLE public.booking_requests
ADD COLUMN counter_offer integer;

-- Add a comment explaining the column
COMMENT ON COLUMN public.booking_requests.counter_offer IS 'Artist counter-offer amount in response to venue offer';