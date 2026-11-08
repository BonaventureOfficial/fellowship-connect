import { useEffect, useRef } from "react";
import { lfLogo } from "@/lib/assets";

const TOTAL_MS = 2500;

/**
 * Splash d'ouverture : logo pendant 2,5s max, puis révèle l'application.
 * Protection contre les réinitialisations infinies du timer.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // Le minuteur est lancé une seule fois au montage
    const timer = window.setTimeout(() => {
      onDoneRef.current();
    }, TOTAL_MS);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Passer l'introduction"
      onClick={() => onDoneRef.current()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
          onDoneRef.current();
        }
      }}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-background select-none"
    >
      <img
        src={lfLogo.url}
        alt="Living Fellowship"
        className="lf-logo-zoom-in w-48 max-w-[60vw] select-none motion-reduce:animate-none sm:w-64"
      />
    </div>
  );
}
