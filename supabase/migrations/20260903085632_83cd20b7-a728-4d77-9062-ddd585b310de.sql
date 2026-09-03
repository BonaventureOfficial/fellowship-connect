CREATE TYPE public.app_role AS ENUM ('ceo','admin','member');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

INSERT INTO public.user_roles (user_id, role)
VALUES ('21b15285-ca01-4220-af5d-01d64f174ae9','ceo')
ON CONFLICT DO NOTHING;

ALTER TABLE public.members DISABLE TRIGGER lf_members_before_write;
UPDATE public.members SET status = 'Vérifié' WHERE user_id = '21b15285-ca01-4220-af5d-01d64f174ae9';
ALTER TABLE public.members ENABLE TRIGGER lf_members_before_write;