import { useEffect, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Splash } from "@/components/Splash";
import { Billboard } from "@/components/Billboard";
import { MemberCard } from "@/components/MemberCard";
import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/lib/members";
import { useRolesMap } from "@/lib/roles";
import { lfLogo } from "@/lib/assets";
import { useUnreadAnnouncements } from "@/lib/announcements";
import {
  Film,
  Sparkles,
  Share2,
  Check,
  RotateCcw,
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
    .select("id,user_id,author_name,author_serial,author_avatar,type,title,description,video_url,duration_seconds,created_at")
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

function HomeComponent() {
  const [showSplash, setShowSplash] = useState(false);
  const [viewMode, setViewMode] = useState<"media" | "community">("media");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLightMode, setIsLightMode] = useState(false);
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem("lf-splash-seen");
    if (!seen) setShowSplash(true);
  }, []);

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

  // Membres
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  // Vidéos d'Accueil
  const {
    data: videos = [],
    isLoading: isLoadingVideos,
    refetch: refetchVideos,
    isRefetching: isRefetchingVideos,
  } = useQuery({
    queryKey: ["videos", "video"],
    queryFn: fetchVideos,
  });

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const fullName = `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase();
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

  const handleShareVideo = (video: VideoPost) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(video.video_url);
      setCopiedVideoId(video.id);
      setTimeout(() => setCopiedVideoId(null), 2000);
    }
  };

  if (showSplash) return <Splash onDone={handleDone} />;

  return (
    <div className="relative min-h-screen">
      {/* ========================================================
          1. HEADER FIXE AU SCROLL
          ======================================================== */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl transition-colors shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
          {/* Logo LF seul */}
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

          {/* Onglet de recherche (affiche la communauté) */}
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
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none" stroke="currentColor" strokeWidth={2.2}>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <span>{viewMode === "community" ? "Communauté" : "Recherche"}</span>
            <span className="rounded-full bg-secondary px-1.5 py-0.2 text-[0.65rem] font-bold text-muted-foreground">
              {members.length}
            </span>
          </button>

          {/* Cloche notification + Thème Jour/Nuit */}
          <div className="flex items-center gap-2">
            <Link
              to="/annonces"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/80 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/50"
              title="Notifications et annonces officielles"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth={2}>
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
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary fill-none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent fill-none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. CONTENU PRINCIPAL
          ======================================================== */}
      <main className="mx-auto max-w-2xl px-4 pt-20 pb-24">
        {viewMode === "community" ? (
          /* VUE COMMUNAUTÉ */
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
                <span>{filteredMembers.length} membre{filteredMembers.length > 1 ? "s" : ""} trouvé{filteredMembers.length > 1 ? "s" : ""}</span>
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
                      <MemberCard member={m} roles={rolesMap.get(m.user_id) ?? []} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : (
          /* ========================================================
              VUE ACCUEIL : FLUX MÉDIA VIDÉO
             ======================================================== */
          <section className="space-y-6">
            {/* Titre & bouton Actualiser */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Flux Vidéos Living Fellowship
                </h2>
              </div>
              <button
                type="button"
                onClick={() => refetchVideos()}
                disabled={isRefetchingVideos}
                className="flex items-center gap-1 text-[0.7rem] font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                <RotateCcw className={`h-3 w-3 ${isRefetchingVideos ? "animate-spin" : ""}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {/* Chargement */}
            {isLoadingVideos ? (
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-3xl border border-border bg-card/60 p-4"
                  />
                ))}
              </div>
            ) : videos.length === 0 ? (
              /* État vide si aucune vidéo */
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center backdrop-blur-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm shadow-primary/20">
                  <Film className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">
                  Aucune vidéo pour le moment
                </h3>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Le flux vidéo d'Accueil est prêt. Les membres officiellement vérifiés peuvent publier des enseignements, témoignages et actualités.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Touchez « Publier » en bas pour commencer</span>
                </div>
              </div>
            ) : (
              /* Liste des vidéos */
              <div className="space-y-6">
                {videos.map((vid) => (
                  <article
                    key={vid.id}
                    className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg transition-all hover:border-primary/40"
                  >
                    {/* Auteur */}
                    <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        {vid.author_avatar ? (
                          <img
                            src={vid.author_avatar}
                            alt={vid.author_name}
                            className="h-9 w-9 rounded-full object-cover border border-primary/30"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/20">
                            {vid.author_name.slice(0, 2).toUpperCase() || "LF"}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-foreground leading-tight">
                            {vid.author_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {vid.author_serial && (
                              <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[0.62rem] font-bold text-primary font-mono">
                                {vid.author_serial}
                              </span>
                            )}
                            <span className="text-[0.65rem] text-muted-foreground">
                              · {formatDate(vid.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Partager / Copier */}
                      <button
                        type="button"
                        onClick={() => handleShareVideo(vid)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                        title="Copier le lien direct de la vidéo"
                      >
                        {copiedVideoId === vid.id ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Share2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Lecteur Vidéo */}
                    <div className="relative aspect-video w-full bg-black">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={vid.video_url}
                        className="h-full w-full object-contain bg-black"
                      />
                      {vid.duration_seconds !== null && vid.duration_seconds > 0 && (
                        <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-0.5 text-[0.68rem] font-bold text-white backdrop-blur-sm">
                          ⏱ {formatDuration(vid.duration_seconds)}
                        </span>
                      )}
                    </div>

                    {/* Titre et description */}
                    <div className="p-4 space-y-1.5">
                      <h3 className="text-sm font-bold text-foreground leading-snug">
                        {vid.title}
                      </h3>
                      {vid.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                          {vid.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
