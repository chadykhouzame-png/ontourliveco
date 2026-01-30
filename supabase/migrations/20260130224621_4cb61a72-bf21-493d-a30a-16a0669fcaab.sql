-- Add check constraints for capacity limits (1-50000)
ALTER TABLE public.venues
ADD CONSTRAINT venues_capacity_min_range CHECK (capacity_min >= 1 AND capacity_min <= 50000);

ALTER TABLE public.venues
ADD CONSTRAINT venues_capacity_max_range CHECK (capacity_max >= 1 AND capacity_max <= 50000);