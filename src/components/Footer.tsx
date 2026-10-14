import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

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
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
                </svg>
              </span>
              <span className={isProfileActive ? "text-primary font-semibold" : ""}>
                Profil
              </span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Modal d'attente Living Réels */}
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none" stroke="currentColor" strokeWidth={1.8}>
                <rect x="2" y="2" width="20" height="20" rx="4" />
                <path d="m10 9 6 3-6 3V9z" fill="currentColor" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              Living Réels
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              La plateforme de vidéos courtes et témoignages verticaux de Living Fellowship est en cours de préparation.
            </p>
            <button
              type="button"
              onClick={() => setShowReelsModal(false)}
              className="mt-6 w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
            >
              Compris !
            </button>
          </div>
        </div>
      )}

      {/* Modal d'attente Publier */}
      {showPublishModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowPublishModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white shadow-lg">
              <svg viewBox="0 0 24 24" className="h-7 w-7 stroke-white" strokeWidth={2.2} strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              Créer & Publier
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Partagez avec la communauté Living Fellowship :
            </p>

            <div className="mt-4 space-y-2 text-left">
              <Link
                to="/annonces"
                onClick={() => setShowPublishModal(false)}
                className="flex items-center justify-between rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">📢 Annonce officielle</p>
                  <p className="text-[0.65rem] text-muted-foreground">Pour les administrateurs et dirigeants</p>
                </div>
                <span className="text-xs text-primary font-bold">→</span>
              </Link>

              <div className="rounded-xl border border-dashed border-border/80 bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">🎬 Nouveau Réel / Vidéo</p>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[0.6rem] font-bold text-primary">
                    Bientôt
                  </span>
                </div>
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                  Enregistrez et publiez une courte vidéo verticale.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-border/80 bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">📝 Post Média & Photo</p>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.6rem] font-bold text-accent">
                    Bientôt
                  </span>
                </div>
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                  Partagez une inspiration avec photo et texte.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPublishModal(false)}
              className="mt-5 w-full rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
