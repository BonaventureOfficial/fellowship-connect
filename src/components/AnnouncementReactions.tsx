import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Comment {
  id: string;
  announcement_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
}

function useReactions() {
  return useQuery({
    queryKey: ["announcement-reactions"],
    queryFn: async () => {
      const [likes, comments, members] = await Promise.all([
        supabase.from("announcement_likes").select("announcement_id,user_id"),
        supabase
          .from("announcement_comments")
          .select("id,announcement_id,parent_id,user_id,content,created_at")
          .order("created_at", { ascending: true }),
        supabase.from("members").select("user_id,first_name,last_name"),
      ]);
      if (likes.error) throw likes.error;
      if (comments.error) throw comments.error;
      const names: Record<string, string> = {};
      for (const m of members.data ?? [])
        names[m.user_id] = `${m.first_name} ${m.last_name}`.trim() || "Membre";
      return {
        likes: likes.data ?? [],
        comments: (comments.data ?? []) as Comment[],
        names,
      };
    },
  });
}

function timeAgo(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AnnouncementReactions({
  announcementId,
  userId,
  isStaff,
}: {
  announcementId: string;
  userId?: string;
  isStaff: boolean;
}) {
  const qc = useQueryClient();
  const { data } = useReactions();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const likes = (data?.likes ?? []).filter((l) => l.announcement_id === announcementId);
  const liked = !!userId && likes.some((l) => l.user_id === userId);
  const comments = useMemo(
    () => (data?.comments ?? []).filter((c) => c.announcement_id === announcementId),
    [data, announcementId],
  );
  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);
  const name = (uid: string) => data?.names[uid] ?? "Membre";
  const refresh = () => qc.invalidateQueries({ queryKey: ["announcement-reactions"] });

  const toggleLike = async () => {
    if (!userId) return toast.error("Connectez-vous pour aimer.");
    const q = liked
      ? supabase.from("announcement_likes").delete().eq("announcement_id", announcementId).eq("user_id", userId)
      : supabase.from("announcement_likes").insert({ announcement_id: announcementId, user_id: userId });
    const { error } = await q;
    if (error) toast.error(error.message);
    refresh();
  };

  const send = async (content: string, parent: string | null) => {
    if (!userId) return toast.error("Connectez-vous pour commenter.");
    if (!content.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("announcement_comments").insert({
      announcement_id: announcementId,
      user_id: userId,
      parent_id: parent,
      content: content.trim().slice(0, 2000),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (parent) {
      setReplyText("");
      setReplyTo(null);
    } else setText("");
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("announcement_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const CommentRow = ({ c, isReply }: { c: Comment; isReply?: boolean }) => (
    <div className={isReply ? "ml-6 mt-2 border-l border-current/20 pl-3" : "mt-3"}>
      <p className="text-xs">
        <span className="font-semibold">{name(c.user_id)}</span>{" "}
        <span className="opacity-60">· {timeAgo(c.created_at)}</span>
      </p>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.content}</p>
      <div className="mt-1 flex gap-3 text-[0.7rem] opacity-70">
        {!isReply && (
          <button type="button" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="hover:opacity-100">
            Répondre
          </button>
        )}
        {(c.user_id === userId || isStaff) && (
          <button type="button" onClick={() => remove(c.id)} className="hover:opacity-100">
            Supprimer
          </button>
        )}
      </div>
      {!isReply && repliesOf(c.id).map((r) => <CommentRow key={r.id} c={r} isReply />)}
      {replyTo === c.id && (
        <div className="ml-6 mt-2 flex gap-2">
          <input
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(replyText, c.id)}
            placeholder={`Répondre à ${name(c.user_id)}…`}
            maxLength={2000}
            className="flex-1 rounded-lg border border-current/30 bg-transparent px-2 py-1 text-xs outline-none"
          />
          <button type="button" disabled={busy} onClick={() => send(replyText, c.id)} className="rounded-lg border border-current/30 px-2 text-xs">
            Envoyer
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-3 border-t border-current/20 pt-2">
      <div className="flex items-center gap-4 text-sm">
        <button type="button" onClick={toggleLike} className={`flex items-center gap-1 ${liked ? "font-semibold" : "opacity-80"}`} aria-pressed={liked}>
          <span aria-hidden>{liked ? "♥" : "♡"}</span> J'aime · {likes.length}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="opacity-80 hover:opacity-100">
          💬 Commentaires · {comments.length}
        </button>
      </div>
      {open && (
        <div>
          {roots.map((c) => (
            <CommentRow key={c.id} c={c} />
          ))}
          {userId ? (
            <div className="mt-3 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(text, null)}
                placeholder="Écrire un commentaire…"
                maxLength={2000}
                className="flex-1 rounded-lg border border-current/30 bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <button type="button" disabled={busy} onClick={() => send(text, null)} className="rounded-lg border border-current/30 px-3 text-sm">
                Publier
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs opacity-70">Connectez-vous pour commenter.</p>
          )}
        </div>
      )}
    </div>
  );
}
