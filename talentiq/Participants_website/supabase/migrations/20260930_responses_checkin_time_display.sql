-- Rebuild the derived display column; the original check-in timestamp is retained.
ALTER TABLE public.responses
  DROP COLUMN IF EXISTS checkin_time_central;

ALTER TABLE public.responses
  ADD COLUMN checkin_time_central text GENERATED ALWAYS AS (
    (((EXTRACT(HOUR FROM (checkin_time AT TIME ZONE 'America/Chicago'))::integer + 11) % 12) + 1)::text
    || ':'
    || lpad(EXTRACT(MINUTE FROM (checkin_time AT TIME ZONE 'America/Chicago'))::integer::text, 2, '0')
    || CASE
      WHEN EXTRACT(HOUR FROM (checkin_time AT TIME ZONE 'America/Chicago')) < 12 THEN ' am'
      ELSE ' pm'
    END
  ) STORED;

COMMENT ON COLUMN public.responses.checkin_time_central IS
  'Central Time (America/Chicago, CST/CDT) in h:mm am/pm format without seconds, derived automatically from checkin_time.';

NOTIFY pgrst, 'reload schema';
