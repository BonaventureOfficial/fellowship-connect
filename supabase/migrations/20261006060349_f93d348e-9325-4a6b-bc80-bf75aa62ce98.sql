GRANT SELECT, INSERT ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
GRANT SELECT ON public.verification_votes TO authenticated;
GRANT ALL ON public.verification_votes TO service_role;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
GRANT SELECT ON public.members, public.user_roles, public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE ON public.members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.members, public.user_roles, public.announcements TO service_role;
GRANT EXECUTE ON FUNCTION public.review_verification(uuid, boolean) TO authenticated;

ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS portrait_path text;

CREATE POLICY "Users upload own portrait" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portraits' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner or staff read portraits" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portraits' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(),'ceo') OR public.has_role(auth.uid(),'admin')));