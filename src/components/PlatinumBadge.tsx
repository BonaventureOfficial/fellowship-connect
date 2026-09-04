export function PlatinumBadge() {
  return (
    <span
      title="Compte vérifié — Platinum"
      className="lf-ring-gradient inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-[1.5px]"
    >
      <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-slate-100 via-white to-slate-300">
        <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
          <path
            d="m5 12.5 4.2 4.2L19 6.5"
            fill="none"
            stroke="#475569"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

