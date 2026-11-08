import { useEffect } from "react";
import { lfLogo } from "@/lib/assets";

const TOTAL_MS = 3000;

/**
 * Splash d'ouverture : logo seul pendant 3s, puis révèle l'application.
 * Ne se joue qu'une fois par session (sessionStorage).
 */
export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, TOTAL_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background">
      <img
        src={lfLogo.url}
        alt="Living Fellowship"
        className="lf-logo-zoom-in w-48 max-w-[60vw] select-none motion-reduce:animate-none sm:w-64"
      />
    </div>
  );
}