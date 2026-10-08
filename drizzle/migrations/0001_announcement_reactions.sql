CREATE TABLE public.announcement_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);
GRANT SELECT ON public.announcement_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.announcement_likes TO authenticated;
GRANT ALL ON public.announcement_likes TO service_role;
ALTER TABLE public.announcement_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by everyone" ON public.announcement_likes FOR SELECT USING (true);
CREATE POLICY "Users like as themselves" ON public.announcement_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own like" ON public.announcement_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.announcement_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.announcement_comments (announcement_id, created_at);
GRANT SELECT ON public.announcement_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.announcement_comments TO authenticated;
GRANT ALL ON public.announcement_comments TO service_role;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by everyone" ON public.announcement_comments FOR SELECT USING (true);
CREATE POLICY "Users comment as themselves" ON public.announcement_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or staff delete comment" ON public.announcement_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;