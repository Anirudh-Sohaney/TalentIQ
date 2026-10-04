ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS major text;
