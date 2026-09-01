import { useEffect, useState } from "react";
import lfLogo from "@/assets/lf-logo.png.asset.json";
import lfMembers from "@/assets/lf-members.png.asset.json";

const TOTAL_MS = 8000; // 3s logo + 5s members

/**
 * Splash d'ouverture : logo zoome en avant (3s) puis la photo des membres
 * zoome en arrière (5s), puis révèle l'application.
 * Ne se joue qu'une fois par session (sessionStorage).
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"logo" | "members">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("members"), 3000);
    const t2 = setTimeout(() => onDone(), TOTAL_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background">
      {/* halo de fond */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, oklch(0.58 0.28 296 / 0.25), transparent 60%), radial-gradient(circle at 50% 55%, oklch(0.82 0.13 200 / 0.18), transparent 65%)",
        }}
      />
      {phase === "logo" ? (
        <img
          src={lfLogo.url}
          alt="Living Fellowship"
          className="lf-logo-zoom-in relative z-10 w-48 max-w-[60vw] select-none sm:w-64"
        />
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-6">
          <img
            src={lfLogo.url}
            alt="Living Fellowship"
            className="w-20 select-none opacity-90 sm:w-24"
          />
          <div className="lf-members-zoom-out relative overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
            <img
              src={lfMembers.url}
              alt="Membres de Living Fellowship"
              className="max-h-[55vh] w-auto max-w-[90vw] select-none object-contain"
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
          </div>
          <p className="lf-billboard-word text-sm font-semibold tracking-[0.3em] uppercase">
            Living Fellowship
          </p>
        </div>
      )}
    </div>
  );
}
