import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content_html: string;
  bg_color: string;
  text_color: string;
  font_family: string;
  published_at: string;
}

export const FONT_OPTIONS = [
  { value: "sans", label: "Moderne", css: "ui-sans-serif, system-ui, sans-serif" },
  { value: "serif", label: "Classique", css: "Georgia, 'Times New Roman', serif" },
  { value: "mono", label: "Machine", css: "ui-monospace, 'Courier New', monospace" },
] as const;

export function fontCss(value: string) {
  return (
    FONT_OPTIONS.find((f) => f.value === value)?.css ?? FONT_OPTIONS[0].css
  );
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("id,author_id,title,content_html,bg_color,text_color,font_family,published_at")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export function useAnnouncements() {
  return useQuery({ queryKey: ["announcements"], queryFn: fetchAnnouncements });
}

const SEEN_KEY = "lf-annonces-seen-at";

export function markAnnouncementsSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEEN_KEY, new Date().toISOString());
  window.dispatchEvent(new Event("lf-annonces-seen"));
}

/** Nombre d'annonces publiées depuis la dernière visite de l'onglet. */
export function useUnreadAnnouncements() {
  const { data } = useAnnouncements();
  const [seenAt, setSeenAt] = useState<string | null>(null);

  useEffect(() => {
    const read = () =>
      setSeenAt(window.localStorage.getItem(SEEN_KEY) ?? "1970-01-01T00:00:00Z");
    read();
    window.addEventListener("lf-annonces-seen", read);
    return () => window.removeEventListener("lf-annonces-seen", read);
  }, []);

  if (!seenAt) return 0;
  return (data ?? []).filter((a) => a.published_at > seenAt).length;
}

/** Nettoyage du HTML riche (exécuté côté navigateur uniquement). */
export function sanitize(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, " ");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = (window as unknown as { __lfPurify?: any }).__lfPurify;
  if (!DOMPurify) return html.replace(/<[^>]*>/g, " ");
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "div", "p", "span", "ul", "ol", "li", "h2", "h3", "a"],
    ALLOWED_ATTR: ["style", "href", "target", "rel"],
  });
}
