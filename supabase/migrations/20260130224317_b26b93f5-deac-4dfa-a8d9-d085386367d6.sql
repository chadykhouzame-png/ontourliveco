-- First, update any NULL equipment_notes to a default value
UPDATE public.venues
SET equipment_notes = 'Please contact venue for equipment details.'
WHERE equipment_notes IS NULL;

-- Make equipment_notes NOT NULL
ALTER TABLE public.venues
ALTER COLUMN equipment_notes SET NOT NULL;

-- Add a default for new records
ALTER TABLE public.venues
ALTER COLUMN equipment_notes SET DEFAULT '';