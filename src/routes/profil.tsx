import { createFileRoute } from "@tanstack/react-router";
import lfLogo from "@/assets/lf-logo.png.asset.json";
import lfMembers from "@/assets/lf-members.png.asset.json";
import lfCover from "@/assets/lf-cover.png.asset.json";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Profil" },
      {
        name: "description",
        content:
          "Profil de l'organisation Living Fellowship : identité, vision et équipe.",
      },
      { property: "og:title", content: "Living Fellowship — Profil" },
      {
        property: "og:description",
        content:
          "Profil de l'organisation Living Fellowship : identité, vision et équipe.",
      },
    ],
  }),
  component: ProfilComponent,
});

function ProfilComponent() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      {/* Bannière identité */}
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <img
          src={lfMembers.url}
          alt="L'équipe Living Fellowship"
          className="h-36 w-full object-cover opacity-70 sm:h-44"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute -bottom-6 left-5 flex items-end gap-3">
          <div className="lf-ring-gradient rounded-2xl p-[2px] shadow-lg">
            <div className="rounded-[14px] bg-card p-1.5">
              <img
                src={lfLogo.url}
                alt="Living Fellowship"
                className="h-14 w-14 select-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-9">
        <h1 className="text-xl font-bold text-foreground">Living Fellowship</h1>
        <p className="text-sm text-muted-foreground">
          Organisation · Fondée en 2024
        </p>
        <p className="lf-billboard-word mt-2 text-sm font-semibold uppercase tracking-[0.2em]">
          Personalite · Potentialite · Prosperite
        </p>
      </div>

      {/* À propos */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">À propos</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Living Fellowship rassemble ses membres autour de trois piliers : la
          personnalité, la potentialité et la prosperité. Nous accompagnons
          chaque membre dans son épanouissement personnel et collectif.
        </p>
      </section>

      {/* Image de couverture */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-border">
        <img
          src={lfCover.url}
          alt="Living Fellowship"
          className="w-full object-cover"
        />
      </section>

      {/* Statistiques */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Membres", value: "5" },
          { label: "Vérifiés", value: "3" },
          { label: "Annonces", value: "3" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 text-center"
          >
            <p className="lf-billboard-word text-2xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </section>

      {/* Coordonnées */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Contact</h2>
        <dl className="mt-2 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Siège</dt>
            <dd className="text-foreground">Burundi-Bujumbura</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">livingfellowship2024@gmail.com</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Statut</dt>
            <dd className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.7rem] font-medium text-accent-foreground">
              Actif
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
