import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Splash } from "@/components/Splash";
import { Billboard } from "@/components/Billboard";
import { MemberCard } from "@/components/MemberCard";
import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/lib/members";
import { useRolesMap } from "@/lib/roles";
import lfLogo from "@/assets/lf-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Accueil" },
      {
        name: "description",
        content:
          "Accueil Living Fellowship : notre devise Personalite, Potentialite, Prosperite et l'annuaire des membres.",
      },
      { property: "og:title", content: "Living Fellowship — Accueil" },
      {
        property: "og:description",
        content:
          "Personalite, Potentialite, Prosperite — l'annuaire des membres de Living Fellowship.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeComponent,
});

async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id,user_id,first_name,last_name,avatar_url,serial,status,created_at")
    .not("serial", "is", null)
    .order("serial", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Member[];
}

function HomeComponent() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem("lf-splash-seen");
    if (!seen) setShowSplash(true);
  }, []);

  const { rolesMap } = useRolesMap();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

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
          {members.length} membre{members.length > 1 ? "s" : ""}
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

        {isLoading ? (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </ul>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Aucun membre enregistré pour le moment
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rendez-vous dans l'onglet Profil pour confirmer votre nom et
              prénom et recevoir votre Serial Number.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {members.map((m: Member, i: number) => (
              <li
                key={m.id}
                className="lf-card-enter"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <MemberCard member={m} roles={rolesMap.get(m.user_id) ?? []} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-[0.7rem] text-muted-foreground">
        © {new Date().getFullYear()} Living Fellowship
      </p>
    </main>
  );
}
