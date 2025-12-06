/*
  # Instapay handles on users (for customer-facing capture)
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS instapay_handle text,
  ADD COLUMN IF NOT EXISTS instapay_channel text;
