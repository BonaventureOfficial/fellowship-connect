CREATE OR REPLACE FUNCTION public.lf_list_admins()
RETURNS TABLE(user_id uuid, role text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'ceo') THEN RAISE EXCEPTION 'Accès réservé au CEO.'; END IF;
  RETURN QUERY SELECT r.user_id, r.role::text, COALESCE(u.email, '')::text
    FROM public.user_roles r LEFT JOIN auth.users u ON u.id = r.user_id
    WHERE r.role IN ('ceo','admin');
END; $$;

CREATE OR REPLACE FUNCTION public.lf_add_admin(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _target uuid; _e text := lower(btrim(coalesce(_email,'')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'ceo') THEN RAISE EXCEPTION 'Accès réservé au CEO.'; END IF;
  IF position('@' in _e) = 0 THEN RAISE EXCEPTION 'Email invalide.'; END IF;
  SELECT id INTO _target FROM auth.users WHERE lower(email) = _e LIMIT 1;
  IF _target IS NULL THEN RAISE EXCEPTION 'Aucun compte avec cet email. La personne doit d''abord créer son compte.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _target AND role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'admin');
  END IF;
  INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
  VALUES (auth.uid(), 'role_grant_admin', _target, jsonb_build_object('email', _e));
END; $$;

CREATE OR REPLACE FUNCTION public.lf_remove_admin(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ceo') THEN RAISE EXCEPTION 'Accès réservé au CEO.'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
  VALUES (auth.uid(), 'role_revoke_admin', _user_id, jsonb_build_object('email', coalesce(_email,'')));
END; $$;

CREATE OR REPLACE FUNCTION public.lf_delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Non connecté.'; END IF;
  IF public.has_role(_uid, 'ceo') THEN RAISE EXCEPTION 'Le compte CEO ne peut pas être supprimé.'; END IF;
  DELETE FROM public.verification_votes WHERE admin_id = _uid
    OR request_id IN (SELECT id FROM public.verification_requests WHERE user_id = _uid);
  DELETE FROM public.verification_requests WHERE user_id = _uid;
  DELETE FROM public.announcements WHERE author_id = _uid;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  DELETE FROM public.members WHERE user_id = _uid;
  INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
  VALUES (_uid, 'account_deleted', _uid, '{}'::jsonb);
  DELETE FROM auth.users WHERE id = _uid;
END; $$;

REVOKE ALL ON FUNCTION public.lf_list_admins() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lf_add_admin(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lf_remove_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lf_delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lf_list_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lf_add_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lf_remove_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lf_delete_my_account() TO authenticated;