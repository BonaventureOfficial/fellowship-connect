CREATE OR REPLACE FUNCTION public.lf_members_before_write()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(current_setting('lf.allow_status', true), '') <> 'on' THEN
      NEW.status = OLD.status;
    END IF;
    NEW.serial = COALESCE(OLD.serial, NEW.serial);
  ELSE
    NEW.status = 'Non Vérifié';
  END IF;
  IF NEW.serial IS NULL AND btrim(COALESCE(NEW.first_name, '')) <> '' AND btrim(COALESCE(NEW.last_name, '')) <> '' THEN
    NEW.serial = 'LF-' || lpad(nextval('public.lf_serial_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_verification(_request_id uuid, _approve boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT user_id INTO _uid FROM public.verification_requests WHERE id = _request_id;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  UPDATE public.verification_requests SET state = CASE WHEN _approve THEN 'Approuvée' ELSE 'Refusée' END WHERE id = _request_id;
  IF _approve THEN
    PERFORM set_config('lf.allow_status', 'on', true);
    UPDATE public.members SET status = 'Vérifié' WHERE user_id = _uid;
    PERFORM set_config('lf.allow_status', 'off', true);
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.review_verification(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_verification(uuid, boolean) TO authenticated;