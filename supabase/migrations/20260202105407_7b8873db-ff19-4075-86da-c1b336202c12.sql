-- Add sound notifications preference column to profiles
ALTER TABLE public.profiles 
ADD COLUMN sound_notifications_enabled BOOLEAN NOT NULL DEFAULT true;