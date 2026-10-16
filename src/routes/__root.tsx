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

  const [video, setVideo] =
    useState<PersistentHomeVideoDetail | null>(null);

  const [playerWidth, setPlayerWidth] = useState(320);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef<number | null>(null);
  const accumulatedWatchTimeRef = useRef(0);
  const viewRegisteredRef = useRef(false);
  const requestInProgressRef = useRef(false);

  // Receive playback handoff events from VideoCard.
  useEffect(() => {
    const handleStart = (event: Event) => {
      const customEvent =
        event as CustomEvent<PersistentHomeVideoDetail>;

      const detail = customEvent.detail;

      if (
        !detail ||
        !detail.id ||
        !detail.videoUrl
      ) {
        return;
      }

      // Stop other videos before starting the persistent player.
      document
        .querySelectorAll<HTMLVideoElement>("video")
        .forEach((otherVideo) => {
          if (
            otherVideo.dataset.lfPersistentHomeVideo !== "true" &&
            !otherVideo.paused
          ) {
            otherVideo.pause();
          }
        });

      accumulatedWatchTimeRef.current =
        Math.max(0, detail.accumulatedWatchTime || 0);

      viewRegisteredRef.current =
        Boolean(detail.viewRegistered);

      requestInProgressRef.current = false;
      lastTimeRef.current = null;

      setVideo(detail);
    };

    const handleClose = () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }

      lastTimeRef.current = null;
      setIsDragging(false);
      setVideo(null);
    };

    window.addEventListener(
      "lf:persistent-video-start",
      handleStart
    );

    window.addEventListener(
      "lf:persistent-video-close",
      handleClose
    );

    return () => {
      window.removeEventListener(
        "lf:persistent-video-start",
        handleStart
      );

      window.removeEventListener(
        "lf:persistent-video-close",
        handleClose
      );
    };
  }, []);

  // Restore the playback position and resume when the source is ready.
  useEffect(() => {
    const playerVideo = videoRef.current;

    if (!video || !playerVideo) {
      return;
    }

    const handleLoadedMetadata = () => {
      const requestedTime = Math.max(0, video.currentTime || 0);
      const duration = playerVideo.duration;

      if (Number.isFinite(duration) && duration > 0) {
        playerVideo.currentTime = Math.min(
          requestedTime,
          Math.max(0, duration - 0.1)
        );
      } else {
        playerVideo.currentTime = requestedTime;
      }

      lastTimeRef.current = playerVideo.currentTime;

      // Autoplay may be blocked by the browser; controls remain available.
      void playerVideo.play().catch(() => {
        // The user can press Play if automatic playback is blocked.
      });
    };

    playerVideo.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata,
      { once: true }
    );

    if (playerVideo.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      playerVideo.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );
    };
  }, [video?.id, video?.videoUrl]);

  // Keep the floating player inside the visible screen while dragging.
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const playerElement = playerRef.current;

      if (!playerElement) {
        return;
      }

      const rect = playerElement.getBoundingClientRect();
      const maxLeft = Math.max(
        8,
        window.innerWidth - rect.width - 8
      );
      const maxTop = Math.max(
        8,
        window.innerHeight - rect.height - 8
      );

      setPosition({
        left: Math.min(
          maxLeft,
          Math.max(8, event.clientX - dragOffsetRef.current.x)
        ),
        top: Math.min(
          maxTop,
          Math.max(8, event.clientY - dragOffsetRef.current.y)
        ),
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging]);

  // Register the same qualified view while the floating video is playing.
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
      .rpc("record_video_view", {
        p_video_id: video.id,
      })
      .then(({ error }) => {
        if (error) {
          console.error(
            "Error recording persistent video view:",
            error
          );
          return;
        }

        viewRegisteredRef.current = true;

        void queryClient.invalidateQueries({
          queryKey: ["videos"],
        });
      })
      .catch((error) => {
        console.error(
          "Error recording persistent video view:",
          error
        );
      })
      .finally(() => {
        requestInProgressRef.current = false;
      });
  };

  const handleTimeUpdate = (
    event: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const playerVideo = event.currentTarget;
    const currentTime = playerVideo.currentTime;
    const previousTime = lastTimeRef.current;

    if (
      previousTime !== null &&
      !playerVideo.paused &&
      !playerVideo.seeking
    ) {
      const delta = currentTime - previousTime;

      // Ignore seeking, backward playback and unusually large jumps.
      if (delta > 0 && delta < 1.5) {
        accumulatedWatchTimeRef.current += delta;
        registerQualifiedView();
      }
    }

    lastTimeRef.current = currentTime;
  };

  const handlePlay = (
    event: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const currentVideo = event.currentTarget;

    lastTimeRef.current = currentVideo.currentTime;

    // Never allow another video to play at the same time.
    document
      .querySelectorAll<HTMLVideoElement>("video")
      .forEach((otherVideo) => {
        if (
          otherVideo !== currentVideo &&
          !otherVideo.paused
        ) {
          otherVideo.pause();
        }
      });
  };

  const handlePause = () => {
    lastTimeRef.current = null;
  };

  const handleDragStart = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    const rect = playerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setPosition({
      left: rect.left,
      top: rect.top,
    });

    setIsDragging(true);
  };

  const closePlayer = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }

    lastTimeRef.current = null;
    setIsDragging(false);
    setVideo(null);
  };

  if (!video) {
    return null;
  }

  return (
    <div
      ref={playerRef}
      className="fixed z-[100] overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-2xl"
      style={{
        width: `${playerWidth}px`,
        maxWidth: "calc(100vw - 16px)",
        right: position ? "auto" : "8px",
        bottom: position ? "auto" : "88px",
        left: position ? `${position.left}px` : undefined,
        top: position ? `${position.top}px` : undefined,
        touchAction: isDragging ? "none" : "auto",
      }}
      aria-label="Lecteur vidéo flottant"
    >
      <div
        className="flex cursor-move items-center justify-between gap-2 border-b border-border bg-background px-3 py-2"
        onPointerDown={handleDragStart}
        style={{ touchAction: "none" }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground">
            {video.title}
          </p>
          <p className="truncate text-[0.68rem] text-muted-foreground">
            {video.authorName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm hover:bg-accent"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() =>
              setPlayerWidth((width) => Math.max(220, width - 40))
            }
            aria-label="Réduire la taille du lecteur"
            title="Réduire"
          >
            −
          </button>

          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm hover:bg-accent"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() =>
              setPlayerWidth((width) => Math.min(480, width + 40))
            }
            aria-label="Agrandir le lecteur"
            title="Agrandir"
          >
            +
          </button>

          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm hover:bg-destructive hover:text-destructive-foreground"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={closePlayer}
            aria-label="Fermer le lecteur"
            title="Fermer"
          >
            ×
          </button>
        </div>
      </div>

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
        className="block aspect-video w-full bg-black object-contain"
        aria-label={video.title}
      />

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-[0.68rem] text-muted-foreground">
          Lecture en arrière-plan de navigation
        </span>

        <Link
          to="/"
          onClick={() => {
            // Keep the player open when returning to the home page.
          }}
          className="shrink-0 text-xs font-semibold text-primary hover:underline"
        >
          Accueil
        </Link>
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