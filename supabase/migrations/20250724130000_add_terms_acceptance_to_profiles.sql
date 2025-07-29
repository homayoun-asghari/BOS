-- Add terms and conditions acceptance columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN terms_accepted_at TIMESTAMPTZ,
ADD COLUMN terms_version TEXT;

-- Backfill existing users with their creation time as terms accepted time
-- and set current terms version to '1.0'
UPDATE public.profiles
SET 
  terms_accepted_at = created_at,
  terms_version = '1.0';
