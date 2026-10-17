import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

// -----------------------------------------------------------------------------
// Persistent home-video player (Architecture PiP Pro Ultra-Fluide)
// -----------------------------------------------------------------------------
type PersistentHomeVideoDetail = {
  id: string;
  title: string;
  authorName: string;
  videoUrl: string;
  currentTime: number;
  muted: boolean;
  isVerifiedMember: boolean;
  accumulatedWatchTime: number;
  viewRegistered: boolean;
};

function PersistentHomeVideoPlayer() {
  const queryClient = useQueryClient();
  const [video, setVideo] = useState<PersistentHomeVideoDetail | null>(null);

  const [playerWidth, setPlayerWidth] = useState(() => {
    if (typeof window !== "undefined") {
      return Math.min(320, Math.max(220, window.innerWidth - 32));
    }
    return 300;
  });

  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);

  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Données de lecture & analytics
  const lastTimeRef = useRef<number | null>(null);
  const accumulatedWatchTimeRef = useRef(0);
  const viewRegisteredRef = useRef(false);
  const requestInProgressRef = useRef(false);

  // Synchronisation des dimensions et position en refs pour les événements sans reflow
  const widthRef = useRef(playerWidth);
  widthRef.current = playerWidth;

  const posRef = useRef<{ left: number; top: number } | null>(null);
  posRef.current = position;

  // État gestuel haute performance (100% hors cycle de rendu React)
  const gestureRef = useRef({
    isActive: false,
    isPinch: false,
    hasMoved: false,
    startTime: 0,
    // Coordonnées de départ
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
    // Déplacements actuels
    deltaX: 0,
    deltaY: 0,
    // Données de pincement (2 doigts)
    startDist: 0,
    startWidth: 300,
    currentScale: 1,
    // Anti-tap parasite
    suppressTapUntil: 0,
    animFrameId: 0,
  });

  // Réception des événements de lecture persistante
  useEffect(() => {
    const handleStart = (event: Event) => {
      const customEvent = event as CustomEvent<PersistentHomeVideoDetail>;
      const detail = customEvent.detail;
      if (!detail || !detail.id || !detail.videoUrl) return;

      // Pause les autres vidéos actives
      document.querySelectorAll<HTMLVideoElement>("video").forEach((otherVideo) => {
        if (otherVideo.dataset.lfPersistentHomeVideo !== "true" && !otherVideo.paused) {
          otherVideo.pause();
        }
      });

      accumulatedWatchTimeRef.current = Math.max(0, detail.accumulatedWatchTime || 0);
      viewRegisteredRef.current = Boolean(detail.viewRegistered);
      requestInProgressRef.current = false;
      lastTimeRef.current = null;
      setIsPlaying(true);
      setVideo(detail);
    };

    const handleClose = () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      lastTimeRef.current = null;
      setVideo(null);
    };

    window.addEventListener("lf:persistent-video-start", handleStart);
    window.addEventListener("lf:persistent-video-close", handleClose);

    return () => {
      window.removeEventListener("lf:persistent-video-start", handleStart);
      window.removeEventListener("lf:persistent-video-close", handleClose);
    };
  }, []);

  // Reprise du timing fluide
  useEffect(() => {
    const playerVideo = videoRef.current;
    if (!video || !playerVideo) return;

    const handleLoadedMetadata = () => {
      const requestedTime = Math.max(0, video.currentTime || 0);
      const duration = playerVideo.duration;
      if (Number.isFinite(duration) && duration > 0) {
        playerVideo.currentTime = Math.min(requestedTime, Math.max(0, duration - 0.1));
      } else {
        playerVideo.currentTime = requestedTime;
      }
      lastTimeRef.current = playerVideo.currentTime;
      void playerVideo.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };

    playerVideo.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    if (playerVideo.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      playerVideo.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [video?.id, video?.videoUrl]);

  // Délimitation dans la fenêtre avec marges de sécurité
  const clampBounds = useCallback((left: number, top: number, width: number) => {
    const player = playerRef.current;
    const height = player ? player.getBoundingClientRect().height : (width * 9) / 16 + 40;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);

    return {
      left: Math.min(maxLeft, Math.max(8, left)),
      top: Math.min(maxTop, Math.max(8, top)),
    };
  }, []);

  // Application des styles GPU directs (sans reflow)
  const applyGpuTransform = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const g = gestureRef.current;

    if (g.isPinch) {
      player.style.transform = `translate3d(${g.deltaX}px, ${g.deltaY}px, 0) scale(${g.currentScale})`;
      player.style.transformOrigin = "center center";
    } else {
      player.style.transform = `translate3d(${g.deltaX}px, ${g.deltaY}px, 0)`;
      player.style.transformOrigin = "top left";
    }
    player.style.transition = "none";
  }, []);

  // Bascule Play/Pause au simple tap
  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      void v.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
    setShowPlayOverlay(true);
    setTimeout(() => setShowPlayOverlay(false), 700);
  }, []);

  // Fermeture du lecteur
  const closePlayer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.pause();
    }
    lastTimeRef.current = null;
    setVideo(null);
  }, []);

  // GESTION TACTILE MOBILE ULTRA-PRO : 2 DOIGTS (PINCH-TO-ZOOM) & 1 DOIGT (DRAG LIBRE)
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onTouchStart = (e: TouchEvent) => {
      // Ignorer les clics sur le bouton fermer
      if ((e.target as HTMLElement).closest("button")) return;

      const rect = player.getBoundingClientRect();
      const curLeft = posRef.current?.left ?? rect.left;
      const curTop = posRef.current?.top ?? rect.top;

      const g = gestureRef.current;
      g.isActive = true;
      g.hasMoved = false;
      g.startTime = Date.now();
      g.deltaX = 0;
      g.deltaY = 0;
      g.originLeft = curLeft;
      g.originTop = curTop;
      g.currentScale = 1;

      if (e.touches.length === 2) {
        // Mode Pinch-to-zoom (2 doigts)
        g.isPinch = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        g.startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        g.startWidth = widthRef.current;
        g.startX = (t1.clientX + t2.clientX) / 2;
        g.startY = (t1.clientY + t2.clientY) / 2;
      } else if (e.touches.length === 1) {
        // Mode Déplacement (1 doigt)
        g.isPinch = false;
        g.startX = e.touches[0].clientX;
        g.startY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!g.isActive) return;

      // Empêche le défilement et le zoom de la page arrière
      if (e.cancelable) {
        e.preventDefault();
      }

      const minW = 180;
      const maxW = Math.min(window.innerWidth - 16, 560);

      if (e.touches.length === 2) {
        // PINCEMENT À 2 DOIGTS : ZOOM / DÉZOOM PROGRESSIF & DOUX
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

        if (!g.isPinch) {
          g.isPinch = true;
          g.startDist = curDist;
          g.startWidth = widthRef.current;
          g.startX = (t1.clientX + t2.clientX) / 2;
          g.startY = (t1.clientY + t2.clientY) / 2;
        }

        if (g.startDist > 10) {
          const rawScale = curDist / g.startDist;
          const targetW = g.startWidth * rawScale;
          const clampedW = Math.min(maxW, Math.max(minW, targetW));
          g.currentScale = clampedW / g.startWidth;

          const midX = (t1.clientX + t2.clientX) / 2;
          const midY = (t1.clientY + t2.clientY) / 2;
          g.deltaX = midX - g.startX;
          g.deltaY = midY - g.startY;
          g.hasMoved = true;

          // Rendu GPU direct à 60 FPS
          cancelAnimationFrame(g.animFrameId);
          g.animFrameId = requestAnimationFrame(applyGpuTransform);
        }
      } else if (e.touches.length === 1 && !g.isPinch) {
        // DÉPLACEMENT À 1 DOIGT : FLUIDE ET LIBRE PARTOUT SUR L'ÉCRAN
        const curX = e.touches[0].clientX;
        const curY = e.touches[0].clientY;
        const dX = curX - g.startX;
        const dY = curY - g.startY;

        if (!g.hasMoved && Math.hypot(dX, dY) > 5) {
          g.hasMoved = true;
        }

        if (g.hasMoved) {
          g.deltaX = dX;
          g.deltaY = dY;

          // Rendu GPU direct à 60 FPS
          cancelAnimationFrame(g.animFrameId);
          g.animFrameId = requestAnimationFrame(applyGpuTransform);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!g.isActive) return;

      if (e.touches.length === 0) {
        g.isActive = false;
        cancelAnimationFrame(g.animFrameId);

        if (g.hasMoved) {
          g.suppressTapUntil = Date.now() + 300;

          const finalW = Math.round(widthRef.current * (g.isPinch ? g.currentScale : 1));
          const targetLeft = g.originLeft + g.deltaX - (finalW - widthRef.current) / 2;
          const targetTop = g.originTop + g.deltaY;
          const clamped = clampBounds(targetLeft, targetTop, finalW);

          // Réinitialisation douce sans saccade
          player.style.transform = "";
          player.style.transition = "";

          setPlayerWidth(finalW);
          setPosition(clamped);
        } else {
          // Simple tap rapide sans mouvement (< 280ms) : Play / Pause
          const elapsed = Date.now() - g.startTime;
          if (elapsed < 280 && Date.now() > g.suppressTapUntil) {
            togglePlayPause();
          }
        }
      } else if (e.touches.length === 1 && g.isPinch) {
        // Transition douce si un doigt reste posé après un pincement
        g.isPinch = false;
        g.startX = e.touches[0].clientX;
        g.startY = e.touches[0].clientY;
      }
    };

    // Écouteurs optimisés
    player.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      player.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(gestureRef.current.animFrameId);
    };
  }, [applyGpuTransform, clampBounds, togglePlayPause]);

  // SUPPORT SOURIS ORDINATEUR (DRAG FLUIDE)
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;

    const player = playerRef.current;
    if (!player) return;

    const rect = player.getBoundingClientRect();
    const curLeft = posRef.current?.left ?? rect.left;
    const curTop = posRef.current?.top ?? rect.top;

    const startX = e.clientX;
    const startY = e.clientY;
    const startTime = Date.now();
    let hasMoved = false;

    const onMouseMove = (ev: MouseEvent) => {
      const dX = ev.clientX - startX;
      const dY = ev.clientY - startY;

      if (!hasMoved && Math.hypot(dX, dY) > 5) {
        hasMoved = true;
      }

      if (hasMoved) {
        player.style.transform = `translate3d(${dX}px, ${dY}px, 0)`;
        player.style.transition = "none";
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      if (hasMoved) {
        gestureRef.current.suppressTapUntil = Date.now() + 300;
        const dX = ev.clientX - startX;
        const dY = ev.clientY - startY;
        const clamped = clampBounds(curLeft + dX, curTop + dY, widthRef.current);

        player.style.transform = "";
        player.style.transition = "";
        setPosition(clamped);
      } else {
        const elapsed = Date.now() - startTime;
        if (elapsed < 280 && Date.now() > gestureRef.current.suppressTapUntil) {
          togglePlayPause();
        }
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Enregistrement des vues qualifiées
  const registerQualifiedView = () => {
    if (
      !video ||
      !video.isVerifiedMember ||
      viewRegisteredRef.current ||
      requestInProgressRef.current ||
      accumulatedWatchTimeRef.current < 30
    ) {
      return;
    }
    requestInProgressRef.current = true;
    supabase
      .rpc("record_video_view", { p_video_id: video.id })
      .then(({ error }) => {
        if (!error) {
          viewRegisteredRef.current = true;
          void queryClient.invalidateQueries({ queryKey: ["videos"] });
        }
      })
      .finally(() => {
        requestInProgressRef.current = false;
      });
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const playerVideo = event.currentTarget;
    const currentTime = playerVideo.currentTime;
    const previousTime = lastTimeRef.current;
    if (previousTime !== null && !playerVideo.paused && !playerVideo.seeking) {
      const delta = currentTime - previousTime;
      if (delta > 0 && delta < 1.5) {
        accumulatedWatchTimeRef.current += delta;
        registerQualifiedView();
      }
    }
    lastTimeRef.current = currentTime;
  };

  const handlePlay = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const currentVideo = event.currentTarget;
    lastTimeRef.current = currentVideo.currentTime;
    setIsPlaying(true);
    document.querySelectorAll<HTMLVideoElement>("video").forEach((otherVideo) => {
      if (otherVideo !== currentVideo && !otherVideo.paused) {
        otherVideo.pause();
      }
    });
  };

  const handlePause = () => {
    lastTimeRef.current = null;
    setIsPlaying(false);
  };

  if (!video) return null;

  return (
    <div
      ref={playerRef}
      onMouseDown={onMouseDown}
      className="fixed z-[100] overflow-hidden rounded-2xl border-2 border-primary/50 bg-card/95 shadow-2xl backdrop-blur-xl select-none"
      style={{
        width: `${playerWidth}px`,
        maxWidth: "calc(100vw - 16px)",
        right: position ? "auto" : "12px",
        bottom: position ? "auto" : "86px",
        left: position ? `${position.left}px` : undefined,
        top: position ? `${position.top}px` : undefined,
        touchAction: "none",
        cursor: "grab",
        willChange: "transform, width",
      }}
      aria-label="Mini lecteur vidéo flottant"
    >
      {/* Barre supérieure épurée et ultra-compacte (Pas de bouton + ni -) */}
      <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-background/90 px-3 py-1.5 cursor-grab active:cursor-grabbing">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground">
            {video.title}
          </p>
          {video.authorName && (
            <p className="truncate text-[0.65rem] text-muted-foreground font-medium">
              {video.authorName}
            </p>
          )}
        </div>

        {/* Bouton fermeture discret */}
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-muted-foreground hover:bg-destructive hover:text-white transition-colors cursor-pointer shrink-0"
          onClick={closePlayer}
          aria-label="Fermer le lecteur"
          title="Fermer"
        >
          <span className="text-xs font-bold leading-none">✕</span>
        </button>
      </div>

      {/* Surface Vidéo active avec lecture continue ininterrompue */}
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        <video
          ref={videoRef}
          key={`${video.id}:${video.videoUrl}`}
          data-lf-persistent-home-video="true"
          data-lf-video-id={video.id}
          src={video.videoUrl}
          playsInline
          loop
          preload="metadata"
          muted={video.muted}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handlePause}
          onSeeked={(event) => {
            lastTimeRef.current = event.currentTarget.currentTime;
          }}
          onPause={handlePause}
          onPlay={handlePlay}
          className="block h-full w-full object-contain pointer-events-none"
          aria-label={video.title}
        />

        {/* Indicateur visuel Play/Pause discret au simple tap */}
        {showPlayOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none transition-opacity">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background/90 text-foreground text-lg shadow-xl backdrop-blur-sm">
              {isPlaying ? "▶" : "❚❚"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// Not found page
// -----------------------------------------------------------------------------
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page introuvable
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Error page
// -----------------------------------------------------------------------------
function ErrorComponent({
  error,
  reset,
}: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page ne s'est pas chargée
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue. Vous pouvez réessayer ou revenir à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Root route
// -----------------------------------------------------------------------------
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title: "Living Fellowship — Gestion des membres",
      },
      {
        name: "description",
        content:
          "Living Fellowship : plateforme de gestion des membres de l'entreprise. Personalié, Potentialité, Prosperité.",
      },
      { name: "author", content: "Living Fellowship" },
      {
        property: "og:title",
        content: "Living Fellowship — Gestion des membres",
      },
      {
        property: "og:description",
        content:
          "Plateforme de gestion des membres de Living Fellowship. Personalié, Potentialité, Prosperité.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@LivingFellowship" },
      { name: "theme-color", content: "#0B0616" },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "application-name",
        content: "Living Fellowship",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        href: "/favicon.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// -----------------------------------------------------------------------------
// HTML shell
// -----------------------------------------------------------------------------
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body className="pb-20">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// -----------------------------------------------------------------------------
// Persistent application root
// -----------------------------------------------------------------------------
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen">
        <Outlet />
        <Footer />
        <PersistentHomeVideoPlayer />
      </div>
    </QueryClientProvider>
  );
}
