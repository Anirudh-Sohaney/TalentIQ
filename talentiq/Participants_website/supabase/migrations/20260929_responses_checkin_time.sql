ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS checkin_time timestamptz;

-- Existing response creation times are the closest available check-in times.
UPDATE public.responses
SET checkin_time = created_at
WHERE checkin_time IS NULL;

ALTER TABLE public.responses
  ALTER COLUMN checkin_time SET DEFAULT now(),
  ALTER COLUMN checkin_time SET NOT NULL;
