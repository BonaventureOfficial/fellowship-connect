import { useEffect, useState, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Member } from "@/lib/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Film,
  Video,
  Image as ImageIcon,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Sparkles,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Send,
  CornerDownRight,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";

type MediaType = "video" | "reel" | "photo" | "text";

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
// MODAL DE PARTAGE ÉTENDU POUR RÉELS
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

  const shareTitle = video.title || "Réel Living Fellowship";
  const shareText = `Regardez ce Réel "${video.title}" par ${video.author_name} sur Living Fellowship :`;

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
      } catch {}
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-3 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Share2 className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">Partager le Réel</h3>
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
            <span>{copied ? "Lien copié !" : "Copier le lien direct"}</span>
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
              <span className="text-[0.65rem] font-semibold text-foreground">X</span>
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
            <span>Plus d'options de partage</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL COMMENTAIRES POUR RÉELS (AVEC RÉPONSES DU CRÉATEUR)
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
      if (error) return [];
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
                Soyez le premier à commenter ce Réel !
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
// CARTE RÉEL INDIVIDUELLE AVEC VUES QUALIFIÉES (10 SECONDES), LIKES ET COMMENTAIRES
// ============================================================================



function ReelCardItem({
  reel,
  isVerifiedMember,
  isLikedByMe,
  onOpenComments,
  onOpenShare,
  onToggleLike,
}: {
  reel: VideoPost;
  isVerifiedMember: boolean;
  isLikedByMe: boolean;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onToggleLike: () => void;
}) {
  const [localViewsCount, setLocalViewsCount] = useState<number>(
    reel.views_count || 0
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatedWatchTimeRef = useRef<number>(0);
  const viewRegisteredRef = useRef<boolean>(false);

  // Share the sound preference across all Reel videos on this page.
  const soundPreferenceKey = "lf-reels-sound-enabled";

  // Apply the saved sound preference and manage autoplay.
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const applySoundPreference = () => {
      const soundEnabled =
        window.sessionStorage.getItem(soundPreferenceKey) === "true";

      video.volume = 0.6;
      video.muted = !soundEnabled;
    };

    applySoundPreference();

    // Remember when the viewer changes the mute control.
    const handleVolumeChange = () => {
      const soundEnabled = !video.muted && video.volume > 0;

      try {
        window.sessionStorage.setItem(
          soundPreferenceKey,
          String(soundEnabled)
        );
      } catch (error) {
        console.debug("Préférence audio non mémorisée :", error);
      }
    };

    video.addEventListener("volumechange", handleVolumeChange);

    if (typeof IntersectionObserver === "undefined") {
      return () => {
        video.removeEventListener("volumechange", handleVolumeChange);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          // Pause other Reels before starting the current one.
              // Pauser TOUTES les autres vidéos (Accueil, lecteur flottant persistant et autres Réels)
    document
      .querySelectorAll<HTMLVideoElement>("video")
      .forEach((otherVideo) => {
        if (otherVideo !== currentVideo && !otherVideo.paused) {
          otherVideo.pause();
        }
      });


          // Reapply the shared sound choice before playback.
          applySoundPreference();

          void video.play().catch((error) => {
            console.debug(
              "Lecture automatique indisponible :",
              error
            );
          });
        } else {
          video.pause();
        }
      },
      {
        threshold: [0, 0.25, 0.6],
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("volumechange", handleVolumeChange);
      video.pause();
    };
  }, []);

  const handleTimeUpdate = (
    e: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const videoEl = e.currentTarget;
    const currentTime = videoEl.currentTime;

    if (lastTimeRef.current !== null) {
      const delta = currentTime - lastTimeRef.current;

      if (delta > 0 && delta < 1.5) {
        accumulatedWatchTimeRef.current += delta;

        // Register a qualified view after 10 seconds of effective playback.
        if (
          isVerifiedMember &&
          !viewRegisteredRef.current &&
          accumulatedWatchTimeRef.current >= 10
        ) {
          viewRegisteredRef.current = true;

          supabase
            .rpc("record_video_view", { p_video_id: reel.id })
            .then(({ data: counted, error }) => {
              if (!error && counted) {
                setLocalViewsCount((prev) => prev + 1);
              }
            })
            .catch((err) =>
              console.error("Erreur enregistrement vue Réel:", err)
            );
        }
      }
    }

    lastTimeRef.current = currentTime;
  };

  const handleSeeked = (
    e: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    lastTimeRef.current = e.currentTarget.currentTime;
  };

  const handlePause = () => {
    lastTimeRef.current = null;
  };

  const handlePlay = (
    e: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const currentVideo = e.currentTarget;

    // Keep only one Reel playing at a time.
    document
      .querySelectorAll<HTMLVideoElement>(
        'video[data-reel-video="true"]'
      )
      .forEach((otherVideo) => {
        if (otherVideo !== currentVideo && !otherVideo.paused) {
          otherVideo.pause();
        }
      });

    // Preserve the selected sound preference and target volume.
    try {
      const soundEnabled =
        window.sessionStorage.getItem(soundPreferenceKey) === "true";

      currentVideo.volume = 0.6;
      currentVideo.muted = !soundEnabled;
    } catch {
      currentVideo.volume = 0.6;
    }

    lastTimeRef.current = currentVideo.currentTime;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-black aspect-[9/15] shadow-xl">
      <video
        ref={videoRef}
        data-reel-video="true"
        controls
        playsInline
        loop
        preload="metadata"
        src={reel.video_url}
        onTimeUpdate={handleTimeUpdate}
        onSeeked={handleSeeked}
        onPause={handlePause}
        onPlay={handlePlay}
        className="h-full w-full object-cover"
      />

      <div className="absolute right-2.5 bottom-16 z-20 flex flex-col items-center gap-3">
        {/* Like */}
        <button
          type="button"
          onClick={onToggleLike}
          className={`flex h-11 w-11 flex-col items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 ${
            isLikedByMe
              ? "bg-purple-600/80 text-white shadow-lg shadow-purple-600/40"
              : "bg-black/60 text-white/90 hover:bg-black/80"
          }`}
          title={
            isLikedByMe
              ? "Vous avez aimé ce Réel 💜"
              : "Aimer ce Réel 💜"
          }
        >
          <Heart
            className={`h-5 w-5 ${
              isLikedByMe ? "fill-white text-white scale-110" : ""
            }`}
          />
          <span className="text-[0.62rem] font-bold leading-none mt-0.5">
            {reel.likes_count || 0}
          </span>
        </button>

        {/* Comments */}
        <button
          type="button"
          onClick={onOpenComments}
          className="flex h-11 w-11 flex-col items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-md hover:bg-black/80 active:scale-90"
          title="Commentaires"
        >
          <MessageCircle className="h-5 w-5 text-primary" />
          <span className="text-[0.62rem] font-bold leading-none mt-0.5">
            {reel.comments_count || 0}
          </span>
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={onOpenShare}
          className="flex h-11 w-11 flex-col items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-md hover:bg-black/80 active:scale-90"
          title="Partager le Réel"
        >
          <Share2 className="h-5 w-5 text-white" />
          <span className="text-[0.6rem] font-bold leading-none mt-0.5">
            Partage
          </span>
        </button>

        {/* Qualified views */}
        <div
          className="flex h-10 w-10 flex-col items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md text-center"
          title="Vues qualifiées (comptes vérifiés, >10s)"
        >
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="text-[0.6rem] font-bold leading-none mt-0.5">
            {localViewsCount}
          </span>
        </div>
      </div>

      {/* Reel information */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4 pr-16 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">{reel.author_name}</span>

          {reel.author_serial && (
            <span className="rounded-full bg-primary/90 px-1.5 py-0.2 text-[0.62rem] font-bold text-white font-mono">
              {reel.author_serial}
            </span>
          )}
        </div>

        <p className="text-xs font-semibold mt-1 line-clamp-1">
          {reel.title}
        </p>

        {reel.description && (
          <p className="text-[0.68rem] text-white/80 line-clamp-2 mt-0.5 leading-snug">
            {reel.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL PUBLIER MONOLITHIQUE
// ============================================================================
interface PublishModalProps {
  open: boolean;
  defaultType?: MediaType;
  onClose: () => void;
}

function PublishModal({ open, defaultType = "video", onClose }: PublishModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mediaType, setMediaType] = useState<MediaType>(defaultType);
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: member } = useQuery({
    queryKey: ["my-member", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Member | null> => {
      const { data, error } = await supabase
        .from("members")
        .select("id,user_id,first_name,last_name,avatar_url,serial,status")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Member | null) ?? null;
    },
  });

  if (!open) return null;

  const isVerified = member?.status === "Vérifié";
  const fileSizeMb = file ? (file.size / (1024 * 1024)).toFixed(1) : null;
  const isLargeFile = file ? file.size > 50 * 1024 * 1024 : false;

  const handleFileSelect = (selectedFile: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFile.type.startsWith("video/")) {
      setErrorMsg("Veuillez sélectionner un fichier vidéo valide (MP4, WebM, MOV...).");
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setVideoPreviewUrl(previewUrl);
    setFile(selectedFile);

    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = previewUrl;
    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration);
      setDuration(dur);
      if (dur > 3600) {
        setErrorMsg("Cette vidéo dépasse la durée maximale autorisée de 60 minutes.");
      }
    };
    tempVideo.onerror = () => {
      setErrorMsg("Impossible de lire la durée de la vidéo. Assurez-vous que le format est compatible.");
    };
  };

  const handleReset = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setFile(null);
    setVideoPreviewUrl(null);
    setDuration(null);
    setUploadProgress(0);
    setErrorMsg(null);
  };

  const handleClose = () => {
    handleReset();
    setTitle("");
    setDescription("");
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handlePublish = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user) {
      setErrorMsg("Vous devez être connecté pour publier.");
      return;
    }
    if (!isVerified) {
      setErrorMsg(
        "Seuls les membres officiellement vérifiés sont autorisés à publier des vidéos et Réels."
      );
      return;
    }
    if (!file) {
      setErrorMsg("Veuillez choisir un fichier vidéo.");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Le titre est obligatoire.");
      return;
    }
    if (duration !== null && duration > 3600) {
      setErrorMsg("La durée de la vidéo ne doit pas dépasser 60 minutes.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setProgressText("Préparation de l'envoi...");

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const supabaseUrl = (supabase as any).supabaseUrl || "https://uivlmlbcmgndeyubqpxv.supabase.co";

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${supabaseUrl}/storage/v1/object/videos/${filePath}`, true);

        if (accessToken) {
          xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
        }
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
            const loadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
            const totalMb = (event.total / (1024 * 1024)).toFixed(1);
            setProgressText(`Téléversement rapide : ${loadedMb} Mo / ${totalMb} Mo (${pct}%)`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgressText("Téléversement terminé avec succès !");
            setUploadProgress(100);
            resolve();
          } else {
            try {
              const resJson = JSON.parse(xhr.responseText);
              reject(new Error(resJson.message || `Erreur serveur (${xhr.status})`));
            } catch {
              reject(new Error(`Échec du téléversement HTTP ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error("Erreur réseau pendant le téléversement de la vidéo."));
        };

        xhr.send(file);
      });

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      const authorName = `${member?.first_name ?? ""} ${member?.last_name ?? ""}`.trim() || "Membre";

      const { error: insertError } = await supabase.from("videos").insert({
        user_id: user.id,
        author_serial: member?.serial ?? null,
        author_name: authorName,
        author_avatar: member?.avatar_url ?? null,
        type: mediaType,
        title: title.trim(),
        description: description.trim() || null,
        video_url: publicUrl,
        duration_seconds: duration,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        shares_count: 0,
      });

      if (insertError) {
        throw new Error(`Erreur d'enregistrement : ${insertError.message}`);
      }

      setSuccessMsg(
        mediaType === "video"
          ? "Vidéo publiée avec succès sur l'Accueil !"
          : "Réel publié avec succès dans la section Réels !"
      );

      queryClient.invalidateQueries({ queryKey: ["videos"] });

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error("Échec publication:", err);
      setErrorMsg(err.message || "Une erreur est survenue lors de la publication.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-border bg-card overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">Studio de Publication</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setMediaType("video");
                handleReset();
              }}
              disabled={uploading}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-all ${
                mediaType === "video"
                  ? "border-primary bg-primary/15 text-primary shadow-sm"
                  : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video className="h-5 w-5" />
              <span className="text-[0.72rem] font-bold">Vidéo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMediaType("reel");
                handleReset();
              }}
              disabled={uploading}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-all ${
                mediaType === "reel"
                  ? "border-primary bg-primary/15 text-primary shadow-sm"
                  : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="h-5 w-5" />
              <span className="text-[0.72rem] font-bold">Réel</span>
            </button>

            <button
              type="button"
              disabled
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border/50 bg-muted/10 p-2.5 text-center text-muted-foreground/50 opacity-60 cursor-not-allowed"
            >
              <ImageIcon className="h-5 w-5" />
              <span className="text-[0.72rem] font-medium">Photo</span>
              <span className="text-[0.55rem] uppercase font-bold text-accent">Bientôt</span>
            </button>

            <button
              type="button"
              disabled
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border/50 bg-muted/10 p-2.5 text-center text-muted-foreground/50 opacity-60 cursor-not-allowed"
            >
              <FileText className="h-5 w-5" />
              <span className="text-[0.72rem] font-medium">Texte</span>
              <span className="text-[0.55rem] uppercase font-bold text-accent">Bientôt</span>
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs">
            <span className="text-muted-foreground font-medium">Statut de créateur :</span>
            {isVerified ? (
              <span className="flex items-center gap-1.5 font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span>Compte Vérifié Éligible</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Vérification requise pour publier</span>
              </span>
            )}
          </div>

          {mediaType === "video" || mediaType === "reel" ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {!videoPreviewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-8 text-center transition-all hover:border-primary hover:bg-primary/10 active:scale-98"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-sm shadow-primary/20">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-foreground">
                    Touchez ici pour importer un fichier vidéo
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                    Depuis le stockage de votre appareil (galerie ou fichiers). Durée max : 60 min.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[0.7rem] font-semibold text-muted-foreground">
                    <span>Format MP4, WebM, MOV</span>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-black aspect-video flex items-center justify-center">
                    <video
                      controls
                      playsInline
                      src={videoPreviewUrl}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Fichier : <strong className="text-foreground">{file?.name}</strong></span>
                      {fileSizeMb && <span>Taille : <strong className="text-foreground">{fileSizeMb} Mo</strong></span>}
                    </div>

                    <div className="flex items-center justify-between">
                      {duration !== null && (
                        <span className={duration > 3600 ? "text-destructive font-bold" : "text-primary font-bold"}>
                          Durée : {formatDuration(duration)} {duration > 3600 ? "(Trop longue > 60 min)" : "✓ Valide"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={uploading}
                        className="flex items-center gap-1 text-destructive font-semibold hover:underline"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Changer</span>
                      </button>
                    </div>

                    {isLargeFile && (
                      <p className="text-[0.68rem] text-accent mt-0.5">
                        💡 Conseil : Fichier lourd (&gt; 50 Mo). Pour un envoi express, filmez en 720p ou 1080p standard.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <Sparkles className="h-8 w-8 text-accent" />
              <p className="mt-2 text-sm font-semibold text-foreground">Bientôt disponible !</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="pub-title" className="text-xs font-semibold text-foreground">
                Titre de la publication <span className="text-primary font-bold">*</span>
              </label>
              <Input
                id="pub-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Message inspirant pour la communauté 2026"
                disabled={uploading}
                className="mt-1"
                maxLength={120}
              />
            </div>

            <div>
              <label htmlFor="pub-desc" className="text-xs font-semibold text-foreground">
                Description <span className="text-muted-foreground font-normal">(optionnelle mais importante)</span>
              </label>
              <Textarea
                id="pub-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Partagez le contexte ou les points clés de votre vidéo..."
                disabled={uploading}
                rows={3}
                className="mt-1 resize-none"
              />
            </div>
          </div>

          {uploading && (
            <div className="space-y-1.5 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span>{progressText}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-xs text-primary border border-primary/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 bg-card px-5 py-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="rounded-xl text-xs"
          >
            Annuler
          </Button>

          <Button
            type="button"
            onClick={handlePublish}
            disabled={
              uploading ||
              mediaType === "photo" ||
              mediaType === "text" ||
              !file ||
              !title.trim() ||
              (duration !== null && duration > 3600)
            }
            className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Envoi en cours…</span>
              </span>
            ) : (
              `Publier ${mediaType === "reel" ? "le Réel" : "la Vidéo"}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL RÉELS AVEC FLUX VERTICAL ET INTERACTIONS (AIMES, COMMENTAIRES, VUES)
// ============================================================================

function ReelsModal({
  open,
  onClose,
  onOpenPublishReel,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPublishReel: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeCommentsReel, setActiveCommentsReel] =
    useState<VideoPost | null>(null);
  const [activeShareReel, setActiveShareReel] =
    useState<VideoPost | null>(null);
  const [likeActionMsg, setLikeActionMsg] = useState<string | null>(null);

  // Detect whether this page was opened from a shared Reel link.
  const sharedReelId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("vid")
      : null;

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

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["videos", "reel"],
    queryFn: async (): Promise<VideoPost[]> => {
      const { data, error } = await supabase
        .from("videos")
        .select(
          "id,user_id,author_name,author_serial,author_avatar,type,title,description,video_url,duration_seconds,likes_count,comments_count,views_count,shares_count,created_at"
        )
        .eq("type", "reel")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement Réels:", error);
        return [];
      }

      return (data ?? []) as VideoPost[];
    },
    enabled: open,
  });

  // When a Reel ID is present in the URL, show only that Reel.
  // Otherwise, preserve the normal list of all Reels.
  
const displayedReels = sharedReelId
  ? (() => {
      const targetedReel = reels.find(
        (reel) => reel.id === sharedReelId
      );

      if (!targetedReel) return reels;

      return [
        targetedReel,
        ...reels.filter((reel) => reel.id !== sharedReelId),
      ];
    })()
  : reels;

  const { data: myLikedIds = new Set<string>() } = useQuery({
    queryKey: ["my-video-likes", user?.id],
    enabled: !!user && open,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", user!.id);

      if (error) return new Set();

      return new Set((data ?? []).map((like: any) => like.video_id));
    },
  });

  const handleLikeReel = async (reel: VideoPost) => {
    if (!user) {
      setLikeActionMsg("Connectez-vous pour aimer ce Réel 💜");
      setTimeout(() => setLikeActionMsg(null), 2500);
      return;
    }

    if (myLikedIds.has(reel.id)) {
      setLikeActionMsg(
        "Vous avez déjà attribué votre j'aime 💜 à ce Réel"
      );
      setTimeout(() => setLikeActionMsg(null), 2500);
      return;
    }

    try {
      const { error } = await supabase.from("video_likes").insert({
        video_id: reel.id,
        user_id: user.id,
      });

      if (!error) {
        setLikeActionMsg("J'aime enregistré 💜 !");
        queryClient.invalidateQueries({
          queryKey: ["my-video-likes", user.id],
        });
        queryClient.invalidateQueries({ queryKey: ["videos"] });
      } else {
        setLikeActionMsg("Vous avez déjà aimé ce Réel 💜");
      }

      setTimeout(() => setLikeActionMsg(null), 2500);
    } catch {
      setLikeActionMsg("Erreur lors du j'aime.");
      setTimeout(() => setLikeActionMsg(null), 2500);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="relative flex h-[92vh] w-full max-w-sm flex-col rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xl">
          {likeActionMsg && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-purple-950/95 border border-purple-500/50 px-3 py-1.5 text-xs font-bold text-purple-200 shadow-xl backdrop-blur-md animate-in fade-in">
              {likeActionMsg}
            </div>
          )}

          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-card/90">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Film className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-foreground">
                Espace Réels
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Chargement des Réels...
              </div>
            ) : displayedReels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Film className="h-7 w-7" />
                </div>

                <h4 className="text-sm font-bold text-foreground">
                  {sharedReelId
                    ? "Ce Réel est introuvable"
                    : "Aucun Réel pour le moment"}
                </h4>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {sharedReelId
                    ? "Ce Réel n'est peut-être plus disponible ou vous n'avez pas accès à son contenu."
                    : "Soyez le premier membre vérifié à publier un Réel vertical pour la communauté !"}
                </p>

                {!sharedReelId && (
                  <Button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPublishReel();
                    }}
                    className="mt-2 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-white text-xs"
                  >
                    Publier un Réel
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {displayedReels.map((reel) => (
                  <ReelCardItem
                    key={reel.id}
                    reel={reel}
                    isVerifiedMember={isVerifiedMember}
                    isLikedByMe={myLikedIds.has(reel.id)}
                    onOpenComments={() => setActiveCommentsReel(reel)}
                    onOpenShare={() => setActiveShareReel(reel)}
                    onToggleLike={() => handleLikeReel(reel)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CommentsModal
        video={activeCommentsReel}
        open={!!activeCommentsReel}
        onClose={() => setActiveCommentsReel(null)}
        currentUserMember={myMember}
      />

      <ShareModal
        video={activeShareReel}
        open={!!activeShareReel}
        onClose={() => setActiveShareReel(null)}
        sharerSerial={myMember?.serial ?? null}
      />
    </>
  );
}

// ============================================================================
// COMPOSANT EXPORTÉ FOOTER
// ============================================================================

export function Footer() {
  const [showReelsModal, setShowReelsModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishDefaultType, setPublishDefaultType] =
    useState<MediaType>("video");

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isHomeActive = currentPath === "/";
  const isProfileActive = currentPath === "/profil";

  // Automatically open the Reels modal for a shared Reel link.
  useEffect(() => {
    const sharedVideoId = new URLSearchParams(
      window.location.search
    ).get("vid");

    if (!sharedVideoId) return;

    let cancelled = false;

    const checkSharedMedia = async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, type")
        .eq("id", sharedVideoId)
        .maybeSingle();

      if (cancelled || error || !data) return;

      if (data.type === "reel") {
        setShowReelsModal(true);
      }
    };

    void checkSharedMedia();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/85 backdrop-blur-xl">
        <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {/* 1. Accueil */}
          <li className="flex-1">
            <Link
              to="/"
              className="group flex flex-col items-center gap-1 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span
                className={`relative flex h-8 w-11 items-center justify-center rounded-xl transition-all ${
                  isHomeActive
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 ${
                    isHomeActive ? "fill-current" : "fill-none"
                  }`}
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path d="M3 11.5 12 4l9 7.5" />
                  <path
                    d="M5 10v10h14V10"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <span
                className={
                  isHomeActive ? "text-primary font-semibold" : ""
                }
              >
                Accueil
              </span>
            </Link>
          </li>

          {/* 2. Réels */}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setShowReelsModal(true)}
              className="group flex w-full flex-col items-center gap-1 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="relative flex h-8 w-11 items-center justify-center rounded-xl text-muted-foreground transition-all group-hover:text-foreground">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <rect
                    x="2"
                    y="2"
                    width="20"
                    height="20"
                    rx="4"
                  />
                  <path
                    d="m10 9 6 3-6 3V9z"
                    fill="currentColor"
                  />
                  <path
                    d="M2 7h20M2 17h20"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <span>Réels</span>
            </button>
          </li>

          {/* 3. Publier */}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => {
                setPublishDefaultType("video");
                setShowPublishModal(true);
              }}
              className="group flex w-full flex-col items-center gap-1 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="relative -mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent text-white shadow-lg shadow-primary/30 transition-transform active:scale-95 group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 stroke-white"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>

              <span className="text-foreground font-semibold">
                Publier
              </span>
            </button>
          </li>

          {/* 4. Profil */}
          <li className="flex-1">
            <Link
              to="/profil"
              className="group flex flex-col items-center gap-1 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span
                className={`relative flex h-8 w-11 items-center justify-center rounded-xl transition-all ${
                  isProfileActive
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 ${
                    isProfileActive ? "fill-current" : "fill-none"
                  }`}
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>

              <span
                className={
                  isProfileActive ? "text-primary font-semibold" : ""
                }
              >
                Profil
              </span>
            </Link>
          </li>
        </ul>
      </nav>

      <ReelsModal
        open={showReelsModal}
        onClose={() => setShowReelsModal(false)}
        onOpenPublishReel={() => {
          setPublishDefaultType("reel");
          setShowPublishModal(true);
        }}
      />

      <PublishModal
        open={showPublishModal}
        defaultType={publishDefaultType}
        onClose={() => setShowPublishModal(false)}
      />
    </>
  );
}