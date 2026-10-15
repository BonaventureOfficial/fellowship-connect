import { useState, useRef } from "react";
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
} from "lucide-react";

type MediaType = "video" | "reel" | "photo" | "text";

interface VideoPost {
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
  created_at: string;
}

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

  // Vérifier le statut du membre
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

    // Détection durée
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
        "Seuls les membres officiellement VÉRIFIÉS peuvent publier des vidéos et des réels. Demandez votre badge dans les paramètres."
      );
      return;
    }

    if (!file) {
      setErrorMsg("Veuillez importer un fichier vidéo.");
      return;
    }

    if (duration !== null && duration > 3600) {
      setErrorMsg("La vidéo dépasse la durée maximale autorisée de 60 minutes.");
      return;
    }

    if (!title.trim()) {
      setErrorMsg("Le titre de la publication est obligatoire (*).");
      return;
    }

    setUploading(true);
    setUploadProgress(5);
    setProgressText("Préparation de l'envoi...");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const filePath = `${user.id}/${Date.now()}-${mediaType}.${ext}`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

      // 1. Upload accéléré avec suivi du pourcentage
      if (supabaseUrl && anonKey) {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${supabaseUrl}/storage/v1/object/videos/${filePath}`, true);
          xhr.setRequestHeader("apikey", anonKey);
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
          xhr.setRequestHeader("x-upsert", "true");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              const loadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
              const totalMb = (event.total / (1024 * 1024)).toFixed(1);
              setUploadProgress(pct);
              setProgressText(`Téléversement : ${pct}% (${loadedMb} Mo / ${totalMb} Mo)`);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else if (xhr.status === 413) {
              reject(
                new Error(
                  "Fichier supérieur à 50 Mo (limite Supabase Storage gratuit). Compressez votre vidéo."
                )
              );
            } else {
              let detail = "";
              try {
                const body = JSON.parse(xhr.responseText);
                detail = body.message || body.error || "";
              } catch {}
              reject(new Error(detail || `Erreur d'envoi (${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error("Erreur réseau pendant le téléversement de la vidéo."));
          xhr.ontimeout = () =>
            reject(new Error("Délai dépassé. La vidéo est trop volumineuse pour la vitesse de connexion."));
          xhr.timeout = 15 * 60 * 1000;

          xhr.send(file);
        });
      } else {
        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(filePath, file, { cacheControl: "3600", upsert: true });
        if (uploadError) throw uploadError;
      }

      setUploadProgress(100);
      setProgressText("Enregistrement dans la communauté...");

      // 2. URL publique
      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      // 3. Insertion en base de données
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
      });

      if (insertError) {
        throw new Error(`Erreur d'enregistrement : ${insertError.message}`);
      }

      setSuccessMsg(
        mediaType === "video"
          ? "Vidéo publiée avec succès sur l'Accueil !"
          : "Réel publié avec succès dans la section Réels !"
      );

      // Actualiser les requêtes pour affichage immédiat
      queryClient.invalidateQueries({ queryKey: ["videos"] });

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue lors de la publication.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-[28px] sm:rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-foreground">Créer une publication</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Format */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Format de contenu
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMediaType("video");
                  handleReset();
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 transition-all ${
                  mediaType === "video"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border/80 bg-background/50 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Video className="h-5 w-5" />
                <span className="text-xs font-semibold">Vidéo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMediaType("reel");
                  handleReset();
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 transition-all ${
                  mediaType === "reel"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border/80 bg-background/50 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Film className="h-5 w-5" />
                <span className="text-xs font-semibold">Réel</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType("photo")}
                className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-muted/20 p-2.5 text-muted-foreground opacity-70"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-xs font-medium">Photo</span>
                <span className="text-[0.6rem] font-bold text-accent">Bientôt</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType("text")}
                className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-muted/20 p-2.5 text-muted-foreground opacity-70"
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs font-medium">Texte</span>
                <span className="text-[0.6rem] font-bold text-accent">Bientôt</span>
              </button>
            </div>

            <p className="mt-2 text-[0.72rem] text-muted-foreground">
              {mediaType === "video" && "📌 Les vidéos longues sont diffusées sur le flux d'Accueil."}
              {mediaType === "reel" && "📌 Les Réels (format vertical) sont diffusés dans l'onglet Réels."}
              {mediaType === "photo" && "⏳ La publication photo sera bientôt disponible."}
              {mediaType === "text" && "⏳ La publication texte sera bientôt disponible."}
            </p>
          </div>

          {/* Import vidéo */}
          {mediaType === "video" || mediaType === "reel" ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {!videoPreviewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-background/50 p-7 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.99] ${
                    mediaType === "reel" ? "aspect-[9/12] max-h-72" : "aspect-video max-h-60"
                  }`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-foreground">
                    Touchez ici pour importer votre {mediaType === "video" ? "vidéo" : "réel"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ouvre la galerie ou le stockage de l'appareil
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                    Format MP4, MOV, WebM · Max 60 minutes
                  </span>
                </button>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
                  <video
                    controls
                    playsInline
                    src={videoPreviewUrl}
                    className={`w-full bg-black ${
                      mediaType === "reel" ? "aspect-[9/14] max-h-80 object-contain mx-auto" : "aspect-video object-cover"
                    }`}
                  />

                  <div className="flex flex-col gap-1 bg-card/95 px-3.5 py-2.5 text-xs border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-medium text-foreground truncate max-w-[170px]">
                          {file?.name}
                        </span>
                        {fileSizeMb && (
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[0.65rem] font-semibold text-muted-foreground">
                            {fileSizeMb} Mo
                          </span>
                        )}
                        {duration !== null && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${
                              duration <= 3600
                                ? "bg-primary/20 text-primary"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            ⏱ {formatDuration(duration)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1 text-[0.72rem] text-muted-foreground hover:text-foreground shrink-0"
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

          {/* Titre & Description */}
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

          {/* Barre de progression avec pourcentage réel en direct */}
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

          {/* Messages */}
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

        {/* Bouton Publier */}
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

// Modal Réels avec flux vertical interactif
function ReelsModal({
  open,
  onClose,
  onOpenPublishReel,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPublishReel: () => void;
}) {
  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["videos", "reel"],
    queryFn: async (): Promise<VideoPost[]> => {
      const { data, error } = await supabase
        .from("videos")
        .select("id,user_id,author_name,author_serial,author_avatar,type,title,description,video_url,duration_seconds,created_at")
        .eq("type", "reel")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Erreur chargement réels:", error);
        return [];
      }
      return (data ?? []) as VideoPost[];
    },
    enabled: open,
  });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex h-[92vh] w-full max-w-sm flex-col rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xl">
        {/* Header Réels */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-card/90">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Film className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">Espace Réels</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Liste verticale des Réels */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
              Chargement des Réels...
            </div>
          ) : reels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Film className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Aucun Réel pour le moment</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Soyez le premier membre vérifié à publier un Réel vertical pour la communauté !
              </p>
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
            </div>
          ) : (
            <div className="space-y-4">
              {reels.map((reel) => (
                <div
                  key={reel.id}
                  className="relative overflow-hidden rounded-2xl border border-border bg-black aspect-[9/15]"
                >
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={reel.video_url}
                    className="h-full w-full object-cover"
                  />
                  {/* Overlay bas avec auteur et titre */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{reel.author_name}</span>
                      {reel.author_serial && (
                        <span className="rounded bg-primary/80 px-1.5 py-0.2 text-[0.62rem] font-bold text-white">
                          {reel.author_serial}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold mt-1 line-clamp-1">{reel.title}</p>
                    {reel.description && (
                      <p className="text-[0.68rem] text-white/80 line-clamp-2 mt-0.5">{reel.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const [showReelsModal, setShowReelsModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishDefaultType, setPublishDefaultType] = useState<MediaType>("video");
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isHomeActive = currentPath === "/";
  const isProfileActive = currentPath === "/profil";

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
                  className={`h-5 w-5 ${isHomeActive ? "fill-current" : "fill-none"}`}
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path d="M3 11.5 12 4l9 7.5" />
                  <path d="M5 10v10h14V10" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={isHomeActive ? "text-primary font-semibold" : ""}>
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
                  <rect x="2" y="2" width="20" height="20" rx="4" />
                  <path d="m10 9 6 3-6 3V9z" fill="currentColor" />
                  <path d="M2 7h20M2 17h20" strokeLinecap="round" />
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
              <span className="text-foreground font-semibold">Publier</span>
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
                  className={`h-5 w-5 ${isProfileActive ? "fill-current" : "fill-none"}`}
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className={isProfileActive ? "text-primary font-semibold" : ""}>
                Profil
              </span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Modal Réels interactif */}
      <ReelsModal
        open={showReelsModal}
        onClose={() => setShowReelsModal(false)}
        onOpenPublishReel={() => {
          setPublishDefaultType("reel");
          setShowPublishModal(true);
        }}
      />

      {/* Modal Publier */}
      <PublishModal
        open={showPublishModal}
        defaultType={publishDefaultType}
        onClose={() => setShowPublishModal(false)}
      />
    </>
  );
}
