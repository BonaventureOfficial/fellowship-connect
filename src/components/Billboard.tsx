const WORDS = ["Personalite", "Potentialite", "Prosperite"];

/**
 * Panneau publicitaire : les trois mots défilent en boucle (marquee)
 * avec un effet néon lumineux, bordé d'ampoules clignotantes.
 */
export function Billboard() {
  // On duplique la liste deux fois pour un défilement fluide en boucle.
  const loop = [...WORDS, ...WORDS, ...WORDS, ...WORDS];

  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      {/* bandeau d'ampoules supérieur */}
      <div className="flex h-3 items-center gap-1.5 border-b border-border/60 bg-background/60 px-2">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="lf-billboard-bulb h-1 w-1 rounded-full bg-accent"
            style={{ animationDelay: `${(i % 4) * 0.18}s` }}
          />
        ))}
      </div>

      {/* marquee */}
      <div className="overflow-hidden py-5">
        <div className="lf-marquee-track gap-6 px-3">
          {loop.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className="lf-billboard-word whitespace-nowrap text-2xl font-extrabold uppercase tracking-wide sm:text-3xl"
            >
              {w}
              <span className="mx-6 text-muted-foreground/40">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* bandeau d'ampoules inférieur */}
      <div className="flex h-3 items-center gap-1.5 border-t border-border/60 bg-background/60 px-2">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="lf-billboard-bulb h-1 w-1 rounded-full bg-primary"
            style={{ animationDelay: `${(i % 4) * 0.18 + 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
}
