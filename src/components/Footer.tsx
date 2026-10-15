import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { PublishModal } from "@/components/PublishModal";

export function Footer() {
  const [showReelsModal, setShowReelsModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
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

          {/* 3. Publier (bouton central mis en valeur) */}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
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
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
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

      {/* Modal d'attente Réels */}
      {showReelsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowReelsModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none" stroke="currentColor" strokeWidth={1.8}>
                <rect x="2" y="2" width="20" height="20" rx="4" />
                <path d="m10 9 6 3-6 3V9z" fill="currentColor" />
                <path d="M2 7h20M2 17h20" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              Section Réels
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Le flux vertical de courtes vidéos inspirantes arrive très bientôt.
              Vous pouvez déjà enregistrer et publier vos premiers réels via le bouton central (+) !
            </p>
            <button
              type="button"
              onClick={() => setShowReelsModal(false)}
              className="mt-6 w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Compris !
            </button>
          </div>
        </div>
      )}

      {/* Nouveau Studio de Publication complet */}
      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />
    </>
  );
}
