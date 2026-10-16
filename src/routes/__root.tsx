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
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

// -----------------------------------------------------------------------------
// Persistent home-video player
// -----------------------------------------------------------------------------

export interface PersistentHomeVideoDetail {
  id: string;
  title: string;
  authorName?: string;
  videoUrl: string;
  currentTime?: number;
  muted?: boolean;
  isVerifiedMember?: boolean;
  accumulatedWatchTime?: number;
  viewRegistered?: boolean;
}

export function PersistentHomeVideoPlayer() {
  const queryClient = useQueryClient();

  const [video, setVideo] = useState<PersistentHomeVideoDetail | null>(null);
  const [playerWidth, setPlayerWidth] = useState(320);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // État de lecture & analytics
  const lastTimeRef = useRef<number | null>(null);
  const accumulatedWatchTimeRef = useRef(0);
  const viewRegisteredRef = useRef(false);
  const requestInProgressRef = useRef(false);

  // Refs de manipulation tactile & souris
  const playerWidthRef = useRef(320);
  playerWidthRef.current = playerWidth;

  const positionRef = useRef<{ left: number; top: number } | null>(null);
  positionRef.current = position;

  const dragStartRef = useRef<{ x: number; y: number; originLeft: number; originTop: number }>({
    x: 0,
    y: 0,
    originLeft: 0,
    originTop: 0,
  });

  const pinchStartRef = useRef<{ distance: number; startWidth: number } | null>(null);
  const hasMovedSignificantlyRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  // Écoute des événements personnalisés d'ouverture / fermeture
  useEffect(() => {
    const handleStart = (event: Event) => {
      const customEvent = event as CustomEvent<PersistentHomeVideoDetail>;
      const detail = customEvent.detail;

      if (!detail?.id || !detail.videoUrl) return;

      // Arrête les autres vidéos de la page
      document.querySelectorAll<HTMLVideoElement>("video").forEach((otherVideo) => {
        if (otherVideo.dataset.lfPersistentHomeVideo !== "true" && !otherVideo.paused) {
          otherVideo.pause();
        }
      });

      accumulatedWatchTimeRef.current = Math.max(0, detail.accumulatedWatchTime || 0);
      viewRegisteredRef.current = Boolean(detail.viewRegistered);
      requestInProgressRef.current = false;
      lastTimeRef.current = null;

      setVideo(detail);
    };

    const handleClose = () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      lastTimeRef.current = null;
      setIsInteracting(false);
      setVideo(null);
    };

    window.addEventListener("lf:persistent-video-start", handleStart);
    window.addEventListener("lf:persistent-video-close", handleClose);

    return () => {
      window.removeEventListener("lf:persistent-video-start", handleStart);
      window.removeEventListener("lf:persistent-video-close", handleClose);
    };
  }, []);

  // Reprise automatique du timing
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
      void playerVideo.play().catch(() => {});
    };

    playerVideo.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    if (playerVideo.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      playerVideo.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [video?.id, video?.videoUrl]);

  // Helper pour garder le lecteur dans les limites de l'écran
  const clampPosition = useCallback((left: number, top: number, width: number) => {
    const player = playerRef.current;
    const height = player ? player.getBoundingClientRect().height : (width * 9) / 16 + 48;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);

    return {
      left: Math.min(maxLeft, Math.max(8, left)),
      top: Math.min(maxTop, Math.max(8, top)),
    };
  }, []);

  // Gestion des événements tactiles : Drag partout & Pinch-to-zoom à 2 doigts doux
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;

      const rect = player.getBoundingClientRect();
      const currentLeft = positionRef.current?.left ?? rect.left;
      const currentTop = positionRef.current?.top ?? rect.top;

      hasMovedSignificantlyRef.current = false;

      // 1. PINCH : Détection directe de 2 doigts
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

        pinchStartRef.current = {
          distance: Math.max(10, dist),
          startWidth: playerWidthRef.current,
        };
        setIsInteracting(true);
        return;
      }

      // 2. DRAG : 1 doigt n'importe où
      if (e.touches.length === 1) {
        pinchStartRef.current = null;
        const touch = e.touches[0];
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          originLeft: currentLeft,
          originTop: currentTop,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Pinch-to-zoom à 2 doigts doux
      if (e.touches.length === 2 && pinchStartRef.current) {
        e.preventDefault(); // Empêche le zoom du navigateur web

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

        const ratio = currentDist / pinchStartRef.current.distance;
        // Lissage doux du facteur d'échelle
        const targetWidth = pinchStartRef.current.startWidth * ratio;

        const minWidth = 200;
        const maxWidth = Math.min(window.innerWidth - 16, 520);
        const newWidth = Math.round(Math.min(maxWidth, Math.max(minWidth, targetWidth)));

        setPlayerWidth(newWidth);
        hasMovedSignificantlyRef.current = true;
        return;
      }

      // Déplacement à 1 doigt n'importe où
      if (e.touches.length === 1 && !pinchStartRef.current) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragStartRef.current.x;
        const deltaY = touch.clientY - dragStartRef.current.y;

        // Seuil d'activation pour distinguer le tap du drag
        if (!hasMovedSignificantlyRef.current && Math.hypot(deltaX, deltaY) > 6) {
          hasMovedSignificantlyRef.current = true;
          setIsInteracting(true);
        }

        if (hasMovedSignificantlyRef.current) {
          e.preventDefault(); // Empêche le scroll de la page sous le lecteur

          const nextLeft = dragStartRef.current.originLeft + deltaX;
          const nextTop = dragStartRef.current.originTop + deltaY;
          const clamped = clampPosition(nextLeft, nextTop, playerWidthRef.current);

          setPosition(clamped);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        if (hasMovedSignificantlyRef.current) {
          // Neutralise les clics résiduels pour éviter de mettre la vidéo en pause
          suppressClickUntilRef.current = Date.now() + 400;
        }
        pinchStartRef.current = null;
        setIsInteracting(false);
      } else if (e.touches.length === 1) {
        // Un doigt a été levé après un pinch
        pinchStartRef.current = null;
        const touch = e.touches[0];
        const rect = player.getBoundingClientRect();
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          originLeft: positionRef.current?.left ?? rect.left,
          originTop: positionRef.current?.top ?? rect.top,
        };
      }
    };

    player.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      player.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [clampPosition]);

  // Support Souris (Desktop) pour le drag
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;

    const player = playerRef.current;
    if (!player) return;

    const rect = player.getBoundingClientRect();
    const currentLeft = positionRef.current?.left ?? rect.left;
    const currentTop = positionRef.current?.top ?? rect.top;

    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (!moved && Math.hypot(deltaX, deltaY) > 4) {
        moved = true;
        setIsInteracting(true);
        hasMovedSignificantlyRef.current = true;
      }

      if (moved) {
        const nextLeft = currentLeft + deltaX;
        const nextTop = currentTop + deltaY;
        setPosition(clampPosition(nextLeft, nextTop, playerWidthRef.current));
      }
    };

    const handleMouseUp = () => {
      if (moved) {
        suppressClickUntilRef.current = Date.now() + 300;
      }
      setIsInteracting(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Fermeture du lecteur
  const closePlayer = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    lastTimeRef.current = null;
    setIsInteracting(false);
    setVideo(null);
  };

  // Comptabilisation des vues qualifiées
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

    document.querySelectorAll<HTMLVideoElement>("video").forEach((otherVideo) => {
      if (otherVideo !== currentVideo && !otherVideo.paused) {
        otherVideo.pause();
      }
    });
  };

  const handlePause = () => {
    lastTimeRef.current = null;
  };

  if (!video) return null;

  return (
    <div
      ref={playerRef}
      onMouseDown={handleMouseDown}
      onClickCapture={(e) => {
        // Empêche de déclencher play/pause si on vient de déplacer ou zoomer le lecteur
        if (Date.now() < suppressClickUntilRef.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      className={`fixed z-[100] overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-2xl select-none transition-shadow ${
        isInteracting ? "shadow-primary/20 scale-[1.01]" : ""
      }`}
      style={{
        width: `${playerWidth}px`,
        maxWidth: "calc(100vw - 16px)",
        right: position ? "auto" : "8px",
        bottom: position ? "auto" : "88px",
        left: position ? `${position.left}px` : undefined,
        top: position ? `${position.top}px` : undefined,
        touchAction: "none",
        cursor: isInteracting ? "grabbing" : "grab",
      }}
      aria-label="Lecteur vidéo flottant"
    >
      {/* Barre supérieure épurée : Titre, Auteur et bouton Fermer uniquement */}
      <div className="flex items-center justify-between gap-2 border-b border-border/80 bg-background/95 backdrop-blur-md px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground leading-tight">
            {video.title}
          </p>
          {video.authorName && (
            <p className="truncate text-[0.68rem] text-muted-foreground">
              {video.authorName}
            </p>
          )}
        </div>

        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-sm font-semibold transition hover:bg-destructive hover:text-destructive-foreground active:scale-95"
          onClick={closePlayer}
          aria-label="Fermer le lecteur"
          title="Fermer"
        >
          ✕
        </button>
      </div>

      {/* Vidéo plein cadre dans la mini-lecture */}
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          key={`${video.id}:${video.videoUrl}`}
          data-lf-persistent-home-video="true"
          data-lf-video-id={video.id}
          src={video.videoUrl}
          controls
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
          className={`block h-full w-full object-contain ${
            isInteracting ? "pointer-events-none" : "pointer-events-auto"
          }`}
          aria-label={video.title}
        />
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
        name: "apple-mobile-web-app-title",
        content: "Living Fellowship",
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