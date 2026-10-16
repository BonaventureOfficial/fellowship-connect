import { useEffect, useState, useMemo, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Splash } from "@/components/Splash";
import { Billboard } from "@/components/Billboard";
import { MemberCard } from "@/components/MemberCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Member } from "@/lib/members";
import { useRolesMap } from "@/lib/roles";
import { lfLogo } from "@/lib/assets";
import { useUnreadAnnouncements } from "@/lib/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Film,
  Sparkles,
  Share2,
  Check,
  RotateCcw,
  Heart,
  MessageCircle,
  Eye,
  Send,
  CornerDownRight,
  X,
  ExternalLink,
  Copy,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Plateforme Média & Communauté" },
      {
        name: "description",
        content:
          "Accueil Living Fellowship : plateforme média et communauté des membres.",
      },
      { property: "og:title", content: "Living Fellowship — Plateforme Média" },
      {
        property: "og:description",
        content: "Plateforme média et communauté de Living Fellowship.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeComponent,
});

export interface VideoPost {
  id: string;
  user_id: string;
  author_name: string;
  author_serial: string | null;
  author_avatar: string | null;
  type: "video" | "reel";
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  shares_count?: number;
  created_at: string;
}

export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  author_name: string;
  author_serial: string | null;
  author_avatar: string | null;
  content: string;
  parent_id: string | null;
  created_at: string;
}

async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id,user_id,first_name,last_name,avatar_url,serial,status,created_at")
    .not("serial", "is", null)
    .order("serial", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Member[];
}

async function fetchVideos(): Promise<VideoPost[]> {
  const { data, error } = await supabase
    .from("videos")
    .select(
      "id,user_id,author_name,author_serial,author_avatar,type,title,description,video_url,duration_seconds,likes_count,comments_count,views_count,shares_count,created_at"
    )
    .eq("type", "video")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Erreur chargement vidéos:", error);
    return [];
  }
  return (data ?? []) as VideoPost[];
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ============================================================================
// MODAL DE PARTAGE ÉTENDU
// ============================================================================
function ShareModal({
  video,
  open,
  onClose,
  sharerSerial,
}: {
  video: VideoPost | null;
  open: boolean;
  onClose: () => void;
  sharerSerial?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  if (!open || !video) return null;

    const currentUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?vid=${encodeURIComponent(video.id)}${
          sharerSerial
            ? `&sharedBy=${encodeURIComponent(sharerSerial)}`
            : ""
        }`
      : video.video_url;

  const shareTitle = video.title || "Vidéo Living Fellowship";
  const shareText = `Regardez "${video.title}" par ${video.author_name} sur Living Fellowship :`;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
      } catch {
        // Annulé
      }
    } else {
      handleCopy();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText} ${currentUrl}`
  )}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    currentUrl
  )}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    currentUrl
  )}&text=${encodeURIComponent(shareTitle)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    currentUrl
  )}&text=${encodeURIComponent(shareTitle)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Share2 className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">Partager la vidéo</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-muted/30 p-3 border border-border/50">
          <p className="text-xs font-bold text-foreground line-clamp-1">{video.title}</p>
          <p className="text-[0.7rem] text-muted-foreground mt-0.5">Par {video.author_name}</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex w-full items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary transition-all hover:bg-primary/20 active:scale-98"
        >
          <span className="flex items-center gap-2.5">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Lien copié dans le presse-papiers !" : "Copier le lien direct"}</span>
          </span>
          <span className="text-[0.68rem] uppercase font-bold text-primary/80">
            {copied ? "✓ Fait" : "Copier"}
          </span>
        </button>

        <div className="space-y-1.5 pt-1">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
            Partager sur vos réseaux
          </p>
          <div className="grid grid-cols-4 gap-2 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-all hover:border-[#25D366] hover:bg-[#25D366]/10 active:scale-95"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/20 text-[#25D366] font-bold text-sm">
                WA
              </span>
              <span className="text-[0.65rem] font-semibold text-foreground">WhatsApp</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-all hover:border-[#229ED9] hover:bg-[#229ED9]/10 active:scale-95"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#229ED9]/20 text-[#229ED9] font-bold text-sm">
                TG
              </span>
              <span className="text-[0.65rem] font-semibold text-foreground">Telegram</span>
            </a>

            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-all hover:border-[#1877F2] hover:bg-[#1877F2]/10 active:scale-95"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877F2]/20 text-[#1877F2] font-bold text-sm">
                FB
              </span>
              <span className="text-[0.65rem] font-semibold text-foreground">Facebook</span>
            </a>

            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-all hover:border-primary hover:bg-primary/10 active:scale-95"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground font-bold text-sm">
                𝕏
              </span>
              <span className="text-[0.65rem] font-semibold text-foreground">X / Twitter</span>
            </a>
          </div>
        </div>

        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button
            type="button"
            variant="outline"
            onClick={handleNativeShare}
            className="w-full rounded-2xl text-xs font-semibold gap-2 border-border"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Plus d'options de partage mobile</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL COMMENTAIRES AVEC RÉPONSES DU CRÉATEUR
// ============================================================================
function CommentsModal({
  video,
  open,
  onClose,
  currentUserMember,
}: {
  video: VideoPost | null;
  open: boolean;
  onClose: () => void;
  currentUserMember: Member | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<VideoComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["video-comments", video?.id],
    enabled: open && !!video,
    queryFn: async (): Promise<VideoComment[]> => {
      if (!video) return [];
      const { data, error } = await supabase
        .from("video_comments")
        .select(
          "id,video_id,user_id,author_name,author_serial,author_avatar,content,parent_id,created_at"
        )
        .eq("video_id", video.id)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Erreur récupération commentaires:", error);
        return [];
      }
      return (data ?? []) as VideoComment[];
    },
  });

  if (!open || !video) return null;

  const topLevelComments = comments.filter((c) => !c.parent_id);
  const repliesMap = new Map<string, VideoComment[]>();
  comments.forEach((c) => {
    if (c.parent_id) {
      const list = repliesMap.get(c.parent_id) || [];
      list.push(c);
      repliesMap.set(c.parent_id, list);
    }
  });

  const handleStartReply = (comment: VideoComment) => {
    setReplyingTo(comment);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    if (!user) {
      setErrorMsg("Veuillez vous connecter pour écrire un commentaire.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const authorName =
        `${currentUserMember?.first_name ?? ""} ${currentUserMember?.last_name ?? ""}`.trim() ||
        "Membre";

      const { error } = await supabase.from("video_comments").insert({
        video_id: video.id,
        user_id: user.id,
        author_name: authorName,
        author_serial: currentUserMember?.serial ?? null,
        author_avatar: currentUserMember?.avatar_url ?? null,
        content: commentText.trim(),
        parent_id: replyingTo ? replyingTo.id : null,
      });

      if (error) throw error;

      setCommentText("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["video-comments", video.id] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible d'envoyer le commentaire.");
    } finally {
      setSubmitting(false);
    }
  };

  const isCreatorOfVideo = user?.id === video.user_id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-border bg-card overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Commentaires ({comments.length})
              </h3>
              <p className="text-[0.65rem] text-muted-foreground line-clamp-1">
                {video.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground animate-pulse">
              Chargement des commentaires...
            </div>
          ) : topLevelComments.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">Aucun commentaire pour le moment</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Soyez le premier à réagir ou poser une question à l'auteur de cette publication !
              </p>
            </div>
          ) : (
            topLevelComments.map((comment) => {
              const replies = repliesMap.get(comment.id) || [];
              const isCommentByVideoCreator = comment.user_id === video.user_id;

              return (
                <div key={comment.id} className="space-y-2.5">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-1.5 transition-colors hover:border-primary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {comment.author_avatar ? (
                          <img
                            src={comment.author_avatar}
                            alt={comment.author_name}
                            className="h-7 w-7 rounded-full object-cover border border-primary/30"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[0.68rem] font-bold text-primary">
                            {comment.author_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">
                              {comment.author_name}
                            </span>
                            {isCommentByVideoCreator && (
                              <span className="rounded-full bg-gradient-to-r from-primary to-accent px-1.5 py-0.2 text-[0.6rem] font-bold text-white shadow-xs">
                                Créateur 👑
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[0.62rem] text-muted-foreground font-mono">
                            {comment.author_serial && <span>{comment.author_serial} ·</span>}
                            <span>{formatDate(comment.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartReply(comment)}
                        className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/10"
                      >
                        <CornerDownRight className="h-3 w-3" />
                        <span>Répondre</span>
                      </button>
                    </div>

                    <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed pl-9">
                      {comment.content}
                    </p>
                  </div>

                  {replies.length > 0 && (
                    <div className="ml-6 space-y-2 border-l-2 border-primary/30 pl-3">
                      {replies.map((reply) => {
                        const isReplyByCreator = reply.user_id === video.user_id;
                        return (
                          <div
                            key={reply.id}
                            className={`rounded-2xl border p-2.5 space-y-1 ${
                              isReplyByCreator
                                ? "border-primary/40 bg-primary/10 shadow-xs"
                                : "border-border/60 bg-muted/10"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {reply.author_avatar ? (
                                  <img
                                    src={reply.author_avatar}
                                    alt={reply.author_name}
                                    className="h-6 w-6 rounded-full object-cover border border-primary/30"
                                  />
                                ) : (
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[0.62rem] font-bold text-primary">
                                    {reply.author_name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[0.72rem] font-bold text-foreground">
                                      {reply.author_name}
                                    </span>
                                    {isReplyByCreator && (
                                      <span className="rounded-full bg-gradient-to-r from-primary to-accent px-1.5 py-0.2 text-[0.58rem] font-bold text-white">
                                        Créateur 👑
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[0.6rem] text-muted-foreground font-mono">
                                    {formatDate(reply.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-[0.72rem] text-foreground/90 whitespace-pre-line leading-relaxed pl-8">
                              {reply.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 px-4 py-2 text-[0.72rem] text-destructive border-t border-destructive/20">
            {errorMsg}
          </div>
        )}

        {replyingTo && (
          <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary font-semibold">
            <span className="flex items-center gap-1.5">
              <CornerDownRight className="h-3.5 w-3.5" />
              <span>Réponse à @{replyingTo.author_name}</span>
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-muted-foreground hover:text-foreground text-[0.7rem]"
            >
              Annuler ✕
            </button>
          </div>
        )}

        <form
          onSubmit={handleSendComment}
          className="border-t border-border/70 bg-card p-3 flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={
              replyingTo
                ? `Répondre à @${replyingTo.author_name}...`
                : isCreatorOfVideo
                ? "Répondre en tant que créateur..."
                : "Écrire un commentaire..."
            }
            className="flex-1 rounded-2xl text-xs py-2 bg-muted/20"
            disabled={submitting}
            maxLength={500}
          />
          <Button
            type="submit"
            disabled={!commentText.trim() || submitting}
            className="h-9 w-9 rounded-2xl bg-gradient-to-r from-primary to-accent p-0 text-white shrink-0 shadow-sm shadow-primary/20 hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// CARTE VIDÉO AVEC COMPTEUR DE VUES STRICT (30s VIDÉO, VÉRIFIÉ SEULEMENT, 24H)
// ET GESTION DES AIMES (💜 UNIQUE À VIE) ET COMMENTAIRES / PARTAGE
// ============================================================================
function VideoCard({
  video,
  isVerifiedMember,
  currentUserId,
  isLikedByMe,
  onOpenComments,
  onOpenShare,
  onToggleLike,
}: {
  video: VideoPost;
  isVerifiedMember: boolean;
  currentUserId: string | null;
  isLikedByMe: boolean;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onToggleLike: () => void;
}) {
  const [localViewsCount, setLocalViewsCount] = useState<number>(video.views_count || 0);

  const lastTimeRef = useRef<number | null>(null);
  const accumulatedWatchTimeRef = useRef<number>(0);
  const viewRegisteredRef = useRef<boolean>(false);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoEl = e.currentTarget;
    const currentTime = videoEl.currentTime;

    if (lastTimeRef.current !== null) {
      const delta = currentTime - lastTimeRef.current;
      if (delta > 0 && delta < 1.5) {
        accumulatedWatchTimeRef.current += delta;

        // RÈGLE STRICTE : Compte vérifié + 30 secondes d'écoute effective
        if (
          isVerifiedMember &&
          !viewRegisteredRef.current &&
          accumulatedWatchTimeRef.current >= 30
        ) {
          viewRegisteredRef.current = true;
          supabase
            .rpc("record_video_view", { p_video_id: video.id })
            .then(({ data: counted, error }) => {
              if (!error && counted) {
                setLocalViewsCount((prev) => prev + 1);
              }
            })
            .catch((err) => console.error("Erreur enregistrement vue:", err));
        }
      }
    }
    lastTimeRef.current = currentTime;
  };

  const handleSeeked = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    lastTimeRef.current = e.currentTarget.currentTime;
  };

  const handlePause = () => {
    lastTimeRef.current = null;
  };

  const handlePlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    lastTimeRef.current = e.currentTarget.currentTime;
  };

  return (<article
  id={`lf-video-${video.id}`}
  className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg transition-all hover:border-primary/40"
>
    
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2.5">
          {video.author_avatar ? (
            <img
              src={video.author_avatar}
              alt={video.author_name}
              className="h-9 w-9 rounded-full object-cover border border-primary/30"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/20">
              {video.author_name.slice(0, 2).toUpperCase() || "LF"}
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-foreground leading-tight">
              {video.author_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {video.author_serial && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[0.62rem] font-bold text-primary font-mono">
                  {video.author_serial}
                </span>
              )}
              <span className="text-[0.65rem] text-muted-foreground">
                · {formatDate(video.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 py-1 text-[0.68rem] font-semibold text-muted-foreground"
            title="Nombre de vues qualifiées (comptes vérifiés, > 30s de visionnage)"
          >
            <Eye className="h-3 w-3 text-primary" />
            <span>{localViewsCount}</span>
          </span>

          <button
            type="button"
            onClick={onOpenShare}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            title="Partager cette vidéo"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative aspect-video w-full bg-black">
        
<video
  controls
  playsInline
  loop
  preload="metadata"
  src={video.video_url}
  onTimeUpdate={handleTimeUpdate}
  onSeeked={handleSeeked}
  onPause={handlePause}
  onPlay={(e) => {
    handlePlay(e);

    // Pause every other video when this one starts.
    document.querySelectorAll("video").forEach((otherVideo) => {
      if (otherVideo !== e.currentTarget && !otherVideo.paused) {
        otherVideo.pause();
      }
    });
  }}
  className="h-full w-full object-contain bg-black"
/>
        {video.duration_seconds !== null && video.duration_seconds > 0 && (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-0.5 text-[0.68rem] font-bold text-white backdrop-blur-sm">
            ⏱ {formatDuration(video.duration_seconds)}
          </span>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-sm font-bold text-foreground leading-snug">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {video.description}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-3">
          {/* Aime 💜 (Un seul aime à vie par ID) */}
          <button
            type="button"
            onClick={onToggleLike}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
              isLikedByMe
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/40 shadow-sm shadow-purple-500/20"
                : "border border-border bg-card text-muted-foreground hover:border-purple-500/40 hover:text-purple-400"
            }`}
            title={
              isLikedByMe
                ? "Vous avez aimé cette vidéo (1 aime à vie 💜)"
                : "Aimer cette vidéo 💜"
            }
          >
            <Heart
              className={`h-4 w-4 transition-transform ${
                isLikedByMe ? "fill-purple-500 text-purple-500 scale-110" : ""
              }`}
            />
            <span>{isLikedByMe ? "Aimé" : "J'aime"}</span>
            <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[0.65rem] font-bold text-purple-300">
              {video.likes_count || 0}
            </span>
          </button>

          {/* Commentaires 💬 */}
          <button
            type="button"
            onClick={onOpenComments}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground active:scale-95"
            title="Ouvrir les commentaires"
          >
            <MessageCircle className="h-4 w-4 text-primary" />
            <span>Commentaires</span>
            <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[0.65rem] font-bold text-primary">
              {video.comments_count || 0}
            </span>
          </button>

          {/* Partager ↗️ */}
          <button
            type="button"
            onClick={onOpenShare}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground active:scale-95"
            title="Partager"
          >
            <Share2 className="h-4 w-4" />
            <span>Partager</span>
          </button>
        </div>
      </div>
    </article>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL ROUTE ACCUEIL
// ============================================================================

function HomeComponent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showSplash, setShowSplash] = useState(false);
  const [viewMode, setViewMode] = useState<"media" | "community">("media");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLightMode, setIsLightMode] = useState(false);

  const [activeCommentsVideo, setActiveCommentsVideo] =
    useState<VideoPost | null>(null);
  const [activeShareVideo, setActiveShareVideo] =
    useState<VideoPost | null>(null);
  const [likeActionMsg, setLikeActionMsg] = useState<string | null>(null);
  const [sharedVideoId, setSharedVideoId] = useState<string | null>(null);

  // Read the shared content ID from the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const videoId = params.get("vid");

    if (videoId) {
      setSharedVideoId(videoId);
      setViewMode("media");
    }
  }, []);

  // Skip the welcome screen when opening a shared link.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (params.has("vid")) {
      setShowSplash(false);
      return;
    }

    const seen = window.sessionStorage.getItem("lf-splash-seen");
    if (!seen) setShowSplash(true);
  }, []);

  // Restore the user's selected theme.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("lf-theme-mode");

    if (stored === "light") {
      setIsLightMode(true);
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      setIsLightMode(false);
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextLight = !isLightMode;
    setIsLightMode(nextLight);

    if (typeof document !== "undefined") {
      if (nextLight) {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        window.localStorage.setItem("lf-theme-mode", "light");
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        window.localStorage.setItem("lf-theme-mode", "dark");
      }
    }
  };

  const { rolesMap } = useRolesMap();
  const unreadAnnouncements = useUnreadAnnouncements();

  const { data: myMember = null } = useQuery({
    queryKey: ["my-member-status", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Member | null> => {
      const { data, error } = await supabase
        .from("members")
        .select("id,user_id,first_name,last_name,avatar_url,serial,status")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) return null;
      return (data as Member | null) ?? null;
    },
  });

  const isVerifiedMember = myMember?.status === "Vérifié";

  const { data: myLikedIds = new Set<string>() } = useQuery({
    queryKey: ["my-video-likes", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", user!.id);

      if (error) return new Set();
      return new Set((data ?? []).map((l: any) => l.video_id));
    },
  });

  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  const {
    data: videos = [],
    isLoading: isLoadingVideos,
    refetch: refetchVideos,
    isRefetching: isRefetchingVideos,
  } = useQuery({
    queryKey: ["videos", "video"],
    queryFn: fetchVideos,
  });

  // Fetch the exact shared item, including a Reel if it is in the videos table.
  const {
    data: sharedVideo = null,
    isLoading: isLoadingSharedVideo,
    isError: isSharedVideoError,
  } = useQuery({
    queryKey: ["shared-video", sharedVideoId],
    enabled: !!sharedVideoId,
    queryFn: async (): Promise<VideoPost | null> => {
      if (!sharedVideoId) return null;

      const { data, error } = await supabase
        .from("videos")
        .select(
          "id,user_id,author_name,author_serial,author_avatar,type,title,description,video_url,duration_seconds,likes_count,comments_count,views_count,shares_count,created_at"
        )
        .eq("id", sharedVideoId)
        .maybeSingle();

      if (error) {
        console.error("Error loading shared content:", error);
        throw error;
      }

      return (data as VideoPost | null) ?? null;
    },
  });

  
  // Show the shared item first, followed by the remaining feed.
  const displayedVideos = useMemo(() => {
    if (!sharedVideoId) return videos;

    const target =
      sharedVideo?.id === sharedVideoId
        ? sharedVideo
        : videos.find((video) => video.id === sharedVideoId);

    if (!target) return [];

    return [
      target,
      ...videos.filter((video) => video.id !== sharedVideoId),
    ];
  }, [videos, sharedVideo, sharedVideoId]);

  // Scroll to the shared item and attempt muted playback.
  useEffect(() => {
    if (!sharedVideoId || !sharedVideo || isLoadingSharedVideo) return;

    const timer = window.setTimeout(() => {
      const card = document.getElementById(`lf-video-${sharedVideoId}`);

      card?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      const player = card?.querySelector("video");

      if (player) {
        player.muted = true;

        const playPromise = player.play();

        if (playPromise) {
          playPromise.catch(() => {
            // Browser autoplay restrictions may require manual playback.
          });
        }
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [sharedVideoId, sharedVideo, isLoadingSharedVideo]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;

    const q = searchQuery.toLowerCase().trim();

    return members.filter((m) => {
      const fullName =
        `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase();
      const serial = (m.serial ?? "").toLowerCase();

      return fullName.includes(q) || serial.includes(q);
    });
  }, [members, searchQuery]);

  const handleDone = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("lf-splash-seen", "1");
    }

    setShowSplash(false);
  };

  // Like action: one lifetime like per user.
  const handleLikeVideo = async (video: VideoPost) => {
    if (!user) {
      setLikeActionMsg("Connectez-vous pour aimer ce contenu 💜");
      setTimeout(() => setLikeActionMsg(null), 3000);
      return;
    }

    if (myLikedIds.has(video.id)) {
      setLikeActionMsg("Vous avez déjà attribué votre j'aime à vie 💜");
      setTimeout(() => setLikeActionMsg(null), 3000);
      return;
    }

    try {
      const { error } = await supabase.from("video_likes").insert({
        video_id: video.id,
        user_id: user.id,
      });

      if (error) {
        if (error.code === "23505") {
          setLikeActionMsg("Vous avez déjà attribué votre j'aime 💜");
        } else {
          setLikeActionMsg("Erreur lors de l'enregistrement du j'aime.");
        }
      } else {
        setLikeActionMsg("J'aime enregistré 💜 !");
        queryClient.invalidateQueries({
          queryKey: ["my-video-likes", user.id],
        });
        queryClient.invalidateQueries({ queryKey: ["videos"] });
      }

      setTimeout(() => setLikeActionMsg(null), 2500);
    } catch {
      setLikeActionMsg("Erreur réseau lors du j'aime.");
      setTimeout(() => setLikeActionMsg(null), 2500);
    }
  };

  if (showSplash) return <Splash onDone={handleDone} />;

  return (
    <div className="relative min-h-screen">
      {likeActionMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-purple-950/90 border border-purple-500/40 px-4 py-2 text-xs font-bold text-purple-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {likeActionMsg}
        </div>
      )}

      {/* FIXED HEADER */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl transition-colors shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              setViewMode("media");
              setSearchQuery("");
            }}
            className="flex items-center transition-transform active:scale-95"
            title="Accueil Living Fellowship"
          >
            <img
              src={lfLogo.url}
              alt="Logo LF"
              className="h-10 w-10 select-none drop-shadow-[0_0_12px_rgba(255,107,0,0.45)]"
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode(viewMode === "community" ? "media" : "community");
            }}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm ${
              viewMode === "community"
                ? "border-primary bg-primary/20 text-primary shadow-[0_0_14px_rgba(255,107,0,0.35)]"
                : "border-border bg-card/80 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
            title="Cliquez pour afficher la communauté"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 fill-none"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <span>{viewMode === "community" ? "Communauté" : "Recherche"}</span>
            <span className="rounded-full bg-secondary px-1.5 py-0.2 text-[0.65rem] font-bold text-muted-foreground">
              {members.length}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to="/annonces"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/80 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/50"
              title="Notifications et annonces officielles"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unreadAnnouncements > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground animate-pulse">
                  {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/80 text-muted-foreground transition-all hover:text-foreground hover:border-primary/50"
              title={isLightMode ? "Activer le mode Nuit" : "Activer le mode Jour"}
            >
              {isLightMode ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-primary fill-none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-accent fill-none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="4" />
                  <path
                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-2xl px-4 pt-20 pb-24">
        {viewMode === "community" ? (
          <section>
            <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="relative flex items-center">
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground fill-none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, prénom ou LF-XXXX..."
                  className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-9 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[0.7rem] text-muted-foreground">
                <span>
                  {filteredMembers.length} membre
                  {filteredMembers.length > 1 ? "s" : ""} trouvé
                  {filteredMembers.length > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("media");
                    setSearchQuery("");
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  ✕ Fermer la recherche
                </button>
              </div>
            </div>

            <Billboard />

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Membres de la Communauté
                </h2>
                <span className="text-[0.7rem] text-muted-foreground">
                  Serial · Statut
                </span>
              </div>

              {isLoadingMembers ? (
                <ul className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      className="h-28 animate-pulse rounded-2xl border border-border bg-card"
                    />
                  ))}
                </ul>
              ) : filteredMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Aucun membre trouvé pour "{searchQuery}"
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vérifiez l'orthographe du nom ou du numéro de série LF.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredMembers.map((m: Member, i: number) => (
                    <li
                      key={m.id}
                      className="lf-card-enter"
                      style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
                    >
                      <MemberCard
                        member={m}
                        roles={rolesMap.get(m.user_id) ?? []}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {sharedVideoId ? "Contenu partagé" : "Flux Vidéos Living Fellowship"}
                </h2>
              </div>

              {!sharedVideoId && (
                <button
                  type="button"
                  onClick={() => refetchVideos()}
                  disabled={isRefetchingVideos}
                  className="flex items-center gap-1 text-[0.7rem] font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <RotateCcw
                    className={`h-3 w-3 ${isRefetchingVideos ? "animate-spin" : ""}`}
                  />
                  <span>Actualiser</span>
                </button>
              )}
            </div>

{(sharedVideoId
  ? isLoadingSharedVideo &&
    !videos.some((video) => video.id === sharedVideoId)
  : isLoadingVideos) ? (
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-3xl border border-border bg-card/60 p-4"
                  />
                ))}
              </div>
            ) : displayedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center backdrop-blur-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm shadow-primary/20">
                  <Film className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">
                  {sharedVideoId
                    ? "Contenu partagé introuvable"
                    : "Aucune vidéo pour le moment"}
                </h3>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {sharedVideoId
                    ? isSharedVideoError
                      ? "Impossible de charger ce contenu. Vérifiez la connexion ou les autorisations d'accès."
                      : "Ce contenu n'est pas disponible ou vous n'avez pas l'autorisation de le consulter."
                    : "Le flux vidéo d'Accueil est prêt. Les membres officiellement vérifiés peuvent publier des enseignements, témoignages et actualités."}
                </p>

                {!sharedVideoId && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Touchez « Publier » en bas pour commencer</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {displayedVideos.map((vid) => (
                  <VideoCard
                    key={vid.id}
                    video={vid}
                    isVerifiedMember={isVerifiedMember}
                    currentUserId={user?.id ?? null}
                    isLikedByMe={myLikedIds.has(vid.id)}
                    onOpenComments={() => setActiveCommentsVideo(vid)}
                    onOpenShare={() => setActiveShareVideo(vid)}
                    onToggleLike={() => handleLikeVideo(vid)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <CommentsModal
        video={activeCommentsVideo}
        open={!!activeCommentsVideo}
        onClose={() => setActiveCommentsVideo(null)}
        currentUserMember={myMember}
      />

      <ShareModal
        video={activeShareVideo}
        open={!!activeShareVideo}
        onClose={() => setActiveShareVideo(null)}
        sharerSerial={myMember?.serial ?? null}
      />
    </div>
  );
}
