export function PlatinumBadge({ label = "Original" }: { label?: string }) {
  return (
    <span
      title="Compte original vérifié — Platinum"
      className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-gradient-to-r from-slate-200/90 via-slate-50/95 to-slate-300/90 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-slate-900 shadow-[0_0_12px_rgba(226,232,240,0.35)]"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
        <path d="m12 2 2.6 2.2 3.4-.3.6 3.3 2.9 1.8-1.6 3 1.6 3-2.9 1.8-.6 3.3-3.4-.3L12 22l-2.6-2.2-3.4.3-.6-3.3L2.5 15l1.6-3-1.6-3 2.9-1.8.6-3.3 3.4.3z" />
        <path
          d="m8.6 12.2 2.3 2.3 4.4-4.6"
          fill="none"
          stroke="#0f172a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}
