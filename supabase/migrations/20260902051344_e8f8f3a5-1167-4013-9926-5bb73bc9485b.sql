CREATE SEQUENCE IF NOT EXISTS public.lf_serial_seq START 1;

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  avatar_url text,
  serial text UNIQUE,
  status text NOT NULL DEFAULT 'Non Vérifié',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.members TO anon;
GRANT SELECT, INSERT, UPDATE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.lf_serial_seq TO authenticated, service_role;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members are viewable by everyone"
  ON public.members FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own member row"
  ON public.members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own member row"
  ON public.members FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.lf_members_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();

  -- Le statut n'est jamais modifiable depuis l'application
  IF TG_OP = 'UPDATE' THEN
    NEW.status = OLD.status;
    NEW.serial = COALESCE(OLD.serial, NEW.serial);
  ELSE
    NEW.status = 'Non Vérifié';
  END IF;

  -- Attribution du Serial Number dès que nom et prénom sont confirmés
  IF NEW.serial IS NULL
     AND btrim(COALESCE(NEW.first_name, '')) <> ''
     AND btrim(COALESCE(NEW.last_name, '')) <> '' THEN
    NEW.serial = 'LF-' || lpad(nextval('public.lf_serial_seq')::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER lf_members_before_write
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.lf_members_before_write();