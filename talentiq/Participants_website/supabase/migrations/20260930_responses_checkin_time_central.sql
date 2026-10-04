-- A readable Central Time value for the Supabase responses table.
-- America/Chicago applies CST or CDT according to the check-in date.
ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS checkin_time_central timestamp without time zone
  GENERATED ALWAYS AS (checkin_time AT TIME ZONE 'America/Chicago') STORED;

COMMENT ON COLUMN public.responses.checkin_time IS
  'Check-in instant recorded by the server. Displayed in UTC by the Supabase API.';
COMMENT ON COLUMN public.responses.checkin_time_central IS
  'Check-in date and time in America/Chicago (CST/CDT), automatically derived from checkin_time.';

NOTIFY pgrst, 'reload schema';
