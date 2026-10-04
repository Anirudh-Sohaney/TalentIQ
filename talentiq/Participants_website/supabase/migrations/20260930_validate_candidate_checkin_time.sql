-- The candidate website consumes this text column directly.
-- Normalize times before saving, including UTC timestamps sent by process-response.
CREATE OR REPLACE FUNCTION public.normalize_candidate_checkin_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  normalized text := lower(btrim(NEW.checkin_time));
BEGIN
  IF normalized ~ '^(0?[1-9]|1[0-2]):[0-5][0-9] (am|pm)$' THEN
    NEW.checkin_time := ltrim(normalized, '0');
  ELSIF normalized ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[t ][0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(z|[+-][0-9]{2}:[0-9]{2})$' THEN
    NEW.checkin_time := to_char(
      NEW.checkin_time::timestamptz AT TIME ZONE 'America/Chicago',
      'FMHH12:MI am'
    );
  ELSE
    RAISE EXCEPTION 'Check-in time must be h:mm am/pm or an ISO timestamp with a timezone.'
      USING ERRCODE = '22007';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER normalize_candidate_checkin_time
  BEFORE INSERT OR UPDATE OF checkin_time ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.normalize_candidate_checkin_time();

-- Updates invoke the normalizer, fixing existing UTC strings and AM/PM casing.
UPDATE public.candidates SET checkin_time = checkin_time;

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_checkin_time_format;
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_checkin_time_format
  CHECK (checkin_time ~ '^([1-9]|1[0-2]):[0-5][0-9] (am|pm)$');
