-- First, fix the venue with swapped min/max values
UPDATE public.venues 
SET capacity_min = capacity_max, capacity_max = capacity_min
WHERE capacity_min > capacity_max AND capacity_min IS NOT NULL AND capacity_max IS NOT NULL;

-- Update any existing NULL values to reasonable defaults
UPDATE public.venues 
SET capacity_min = 50 
WHERE capacity_min IS NULL;

UPDATE public.venues 
SET capacity_max = 200 
WHERE capacity_max IS NULL;

-- Now make the columns NOT NULL
ALTER TABLE public.venues 
ALTER COLUMN capacity_min SET NOT NULL,
ALTER COLUMN capacity_max SET NOT NULL;

-- Add a check constraint to ensure max >= min
ALTER TABLE public.venues 
ADD CONSTRAINT venues_capacity_check CHECK (capacity_max >= capacity_min);

-- Add comments for documentation
COMMENT ON COLUMN public.venues.capacity_min IS 'Minimum venue capacity (required)';
COMMENT ON COLUMN public.venues.capacity_max IS 'Maximum venue capacity (required, must be >= capacity_min)';