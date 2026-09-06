import { createFileRoute } from "@tanstack/react-router";
import { lfLogo } from "@/lib/assets";

export const Route = createFileRoute("/annonces")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Annonces" },
      {
        name: "description",
        content:
          "Annonces et communications officielles de Living Fellowship.",
      },
      { property: "og:title", content: "Living Fellowship — Annonces" },
      {
        property: "og:description",
        content:
          "Annonces et communications officielles de Living Fellowship.",
      },
    ],
  }),
  component: AnnoncesComponent,
});

const annonces = [
  {
    date: "01 Sept 2026",
    title: "Réunion générale mensuelle",
    body: "La prochaine réunion générale se tiendra le 12 septembre à 15h00. Présence obligatoire pour tous les membres vérifiés.",
    tag: "Réunion",
  },
  {
    date: "28 Août 2026",
    title: "Campagne de vérification des membres",
    body: "Tous les membres portant le statut « Non Vérifié » sont invités à régulariser leur dossier avant le 20 septembre.",
    tag: "Important",
  },
  {
    date: "20 Août 2026",
    title: "Nouveau comité d'organisation",
    body: "Félicitations aux nouveaux membres du comité d'organisation élus lors de la dernière assemblée.",
    tag: "Élection",
  },
];

function AnnoncesComponent() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      <header className="flex items-center gap-3">
        <img
          src={lfLogo.url}
          alt="Living Fellowship"
          className="h-10 w-10 select-none"
        />
        <div>
          <h1 className="text-lg font-bold text-foreground">Annonces</h1>
          <p className="text-[0.7rem] text-muted-foreground">
            Communications officielles de Living Fellowship
          </p>
        </div>
      </header>

      <ul className="mt-6 space-y-3">
        {annonces.map((a, i) => (
          <li
            key={a.title}
            className="lf-card-enter rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                {a.tag}
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                {a.date}
              </span>
            </div>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              {a.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {a.body}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
