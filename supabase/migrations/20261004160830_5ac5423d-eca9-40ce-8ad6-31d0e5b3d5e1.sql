-- Votes de validation
CREATE TABLE public.verification_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approve boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, admin_id)
);
GRANT SELECT ON public.verification_votes TO authenticated;
GRANT ALL ON public.verification_votes TO service_role;
ALTER TABLE public.verification_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view votes" ON public.verification_votes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.verification_requests
  ADD COLUMN approvals_count integer NOT NULL DEFAULT 0,
  ADD COLUMN refusals_count integer NOT NULL DEFAULT 0;

-- Les admins ne modifient plus les demandes directement : tout passe par review_verification
DROP POLICY IF EXISTS "Staff can update verification requests" ON public.verification_requests;

-- Journal sécurisé
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);

-- Vote de validation (4 votes requis)
CREATE OR REPLACE FUNCTION public.review_verification(_request_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid; _state text; _yes int; _no int; _required constant int := 4;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT user_id, state INTO _uid, _state FROM public.verification_requests WHERE id = _request_id FOR UPDATE;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF _state <> 'En attente' THEN RAISE EXCEPTION 'Cette demande est déjà clôturée'; END IF;
  IF _uid = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas valider votre propre demande'; END IF;
  IF EXISTS (SELECT 1 FROM public.verification_votes WHERE request_id = _request_id AND admin_id = auth.uid()) THEN
    RAISE EXCEPTION 'Vous avez déjà voté pour cette demande';
  END IF;

  INSERT INTO public.verification_votes (request_id, admin_id, approve) VALUES (_request_id, auth.uid(), _approve);
  SELECT count(*) FILTER (WHERE approve), count(*) FILTER (WHERE NOT approve)
    INTO _yes, _no FROM public.verification_votes WHERE request_id = _request_id;

  UPDATE public.verification_requests
    SET approvals_count = _yes, refusals_count = _no,
        state = CASE WHEN _yes >= _required THEN 'Approuvée' WHEN _no >= _required THEN 'Refusée' ELSE 'En attente' END
    WHERE id = _request_id;

  INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'verification_approve' ELSE 'verification_refuse' END, _uid,
          jsonb_build_object('request_id', _request_id, 'approvals', _yes, 'refusals', _no));

  IF _yes >= _required THEN
    PERFORM set_config('lf.allow_status', 'on', true);
    UPDATE public.members SET status = 'Vérifié' WHERE user_id = _uid;
    PERFORM set_config('lf.allow_status', 'off', true);
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (auth.uid(), 'account_verified', _uid, jsonb_build_object('request_id', _request_id, 'approvals', _yes));
  ELSIF _no >= _required THEN
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (auth.uid(), 'account_refused', _uid, jsonb_build_object('request_id', _request_id, 'refusals', _no));
  END IF;
END; $$;

-- Journal des annonces
CREATE OR REPLACE FUNCTION public.lf_log_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (actor_id, action, details)
    VALUES (auth.uid(), 'announcement_publish', jsonb_build_object('announcement_id', NEW.id, 'title', NEW.title));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (actor_id, action, details)
    VALUES (auth.uid(), 'announcement_edit', jsonb_build_object('announcement_id', NEW.id, 'title', NEW.title));
    RETURN NEW;
  ELSE
    INSERT INTO public.audit_log (actor_id, action, details)
    VALUES (auth.uid(), 'announcement_delete', jsonb_build_object('announcement_id', OLD.id, 'title', OLD.title));
    RETURN OLD;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.lf_log_announcement() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER lf_log_announcement AFTER INSERT OR UPDATE OR DELETE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.lf_log_announcement();