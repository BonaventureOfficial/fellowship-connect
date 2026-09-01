import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Splash } from "@/components/Splash";
import { Billboard } from "@/components/Billboard";
import { MemberCard } from "@/components/MemberCard";
import { members } from "@/lib/members";
import lfLogo from "@/assets/lf-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Accueil" },
      {
        name: "description",
        content:
          "Accueil Living Fellowship : notre devise Personalié, Potentialité, Prosperité et l'annuaire des membres.",
      },
      { property: "og:title", content: "Living Fellowship — Accueil" },
      {
        property: "og:description",
        content:
          "Personalié, Potentialité, Prosperité — l'annuaire des membres de Living Fellowship.",
      },
    ],
  }),
  component: HomeComponent,
});

function HomeComponent() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem("lf-splash-seen");
    if (!seen) setShowSplash(true);
  }, []);

  const handleDone = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("lf-splash-seen", "1");
    }
    setShowSplash(false);
  };

  if (showSplash) return <Splash onDone={handleDone} />;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      {/* En-tête marque */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={lfLogo.url}
            alt="Living Fellowship"
            className="h-10 w-10 select-none"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide text-foreground">
              Living Fellowship
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-[0.7rem] font-medium text-muted-foreground">
          {members.length} membres
        </span>
      </header>

      {/* Panneau publicitaire */}
      <Billboard />

      {/* Annuaire des membres */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Membres
          </h2>
          <span className="text-[0.7rem] text-muted-foreground">
            Serial · Statut
          </span>
        </div>
        <ul className="space-y-3">
          {members.map((m, i) => (
            <li key={m.serial} className="lf-card-enter" style={{ animationDelay: `${i * 90}ms` }}>
              <MemberCard member={m} />
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-center text-[0.7rem] text-muted-foreground">
        © {new Date().getFullYear()} Living Fellowship
      </p>
    </main>
  );
}
