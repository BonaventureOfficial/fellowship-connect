/**
 * Badge de vérification en forme de rosace (soleil festonné) avec une coche.
 * - platinum : réservé au CEO
 * - blue : tous les membres vérifiés
 */
type Variant = "platinum" | "blue";

const PALETTE: Record<Variant, { stops: [string, string, string]; stroke: string; check: string; label: string }> = {
  platinum: {
    stops: ["#f1f5f9", "#cbd5e1", "#94a3b8"],
    stroke: "#e2e8f0",
    check: "#334155",
    label: "Compte vérifié — Platinum",
  },
  blue: {
    stops: ["#7dd3fc", "#3b82f6", "#1d4ed8"],
    stroke: "#93c5fd",
    check: "#ffffff",
    label: "Compte vérifié",
  },
};

export function PlatinumBadge({
  className = "h-5 w-5",
  variant = "platinum",
}: {
  className?: string | undefined;
  variant?: Variant;
}) {
  const cx = 12;
  const cy = 12;
  const lobes = 12;
  const pts: string[] = [];
  for (let i = 0; i < lobes * 2; i++) {
    const r = i % 2 === 0 ? 11 : 9.3;
    const a = (Math.PI * i) / lobes - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  const p = PALETTE[variant];
  const gid = `lf-badge-${variant}`;

  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={p.label} className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.stops[0]} />
          <stop offset="45%" stopColor={p.stops[1]} />
          <stop offset="100%" stopColor={p.stops[2]} />
        </linearGradient>
      </defs>
      <polygon points={pts.join(" ")} fill={`url(#${gid})`} stroke={p.stroke} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="m7.5 12.3 3 3 6-6.6" fill="none" stroke={p.check} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Affiche le bon badge : platinum pour le CEO, bleu pour les vérifiés. */
export function VerificationBadge({
  isCeo,
  verified,
  className,
}: {
  isCeo: boolean;
  verified: boolean;
  className?: string | undefined;
}) {
  if (isCeo) return <PlatinumBadge className={className} variant="platinum" />;
  if (verified) return <PlatinumBadge className={className} variant="blue" />;
  return null;
}
