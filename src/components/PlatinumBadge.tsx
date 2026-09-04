/**
 * Badge de vérification platinum en forme de rosace (soleil festonné)
 * avec une coche au centre — style « compte vérifié » premium.
 */
export function PlatinumBadge({ className = "h-5 w-5" }: { className?: string }) {
  // Rosace à 12 lobes : alternance rayon externe / interne.
  const cx = 12;
  const cy = 12;
  const lobes = 12;
  const pts: string[] = [];
  for (let i = 0; i < lobes * 2; i++) {
    const r = i % 2 === 0 ? 11 : 9.3;
    const a = (Math.PI * i) / lobes - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Compte vérifié — Platinum"
      className={`inline-block shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="lf-platinum" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <polygon
        points={pts.join(" ")}
        fill="url(#lf-platinum)"
        stroke="#e2e8f0"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="m7.5 12.3 3 3 6-6.6"
        fill="none"
        stroke="#334155"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
