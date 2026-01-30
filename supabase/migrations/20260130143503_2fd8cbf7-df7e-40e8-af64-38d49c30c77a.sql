-- Add email notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email_notifications_enabled boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.email_notifications_enabled IS 'Whether the user wants to receive email notifications';