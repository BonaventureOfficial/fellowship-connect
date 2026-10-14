import { useEffect, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Splash } from "@/components/Splash";
import { Billboard } from "@/components/Billboard";
import { MemberCard } from "@/components/MemberCard";
import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/lib/members";
import { useRolesMap } from "@/lib/roles";
import { lfLogo } from "@/lib/assets";
import { useUnreadAnnouncements } from "@/lib/announcements";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Plateforme Média & Communauté" },
      {
        name: "description",
        content:
          "Accueil Living Fellowship : plateforme média et communauté des membres.",
      },
      { property: "og:title", content: "Living Fellowship — Plateforme Média" },
      {
        property: "og:description",
        content: "Plateforme média et communauté de Living Fellowship.",
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
  const [viewMode, setViewMode] = useState<"media" | "community">("media");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLightMode, setIsLightMode] = useState(false);

  // Splash initial
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem("lf-splash-seen");
    if (!seen) setShowSplash(true);
  }, []);

  // Détection du mode Jour / Nuit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("lf-theme-mode");
    if (stored === "light") {
      setIsLightMode(true);
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      setIsLightMode(false);
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextLight = !isLightMode;
    setIsLightMode(nextLight);
    if (typeof document !== "undefined") {
      if (nextLight) {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        window.localStorage.setItem("lf-theme-mode", "light");
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        window.localStorage.setItem("lf-theme-mode", "dark");
      }
    }
  };

  const { rolesMap } = useRolesMap();
  const unreadAnnouncements = useUnreadAnnouncements();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  // Filtrage des membres dans l'onglet communauté
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const fullName = `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase();
      const serial = (m.serial ?? "").toLowerCase();
      return fullName.includes(q) || serial.includes(q);
    });
  }, [members, searchQuery]);

  const handleDone = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("lf-splash-seen", "1");
    }
    setShowSplash(false);
  };

  if (showSplash) return <Splash onDone={handleDone} />;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-24">
      {/* ========================================================
          1. HEADER NOUVEAU DESIGN MÉDIA
          a. Gauche : Logo LF seul (sans le texte "Living Fellowship")
          b. Milieu : Onglet de recherche (ouvre la communauté)
          c. Droite : Cloche de notification + Switch Jour/Nuit
          ======================================================== */}
      <header className="sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between border-b border-border/50 bg-background/85 px-4 py-2.5 backdrop-blur-xl transition-colors">
        {/* a. A gauche : Logo seul */}
        <button
          type="button"
          onClick={() => {
            setViewMode("media");
            setSearchQuery("");
          }}
          className="flex items-center transition-transform active:scale-95"
          title="Accueil Living Fellowship"
        >
          <img
            src={lfLogo.url}
            alt="Logo LF"
            className="h-10 w-10 select-none drop-shadow-[0_0_10px_rgba(112,34,255,0.4)]"
          />
        </button>

        {/* b. Au milieu : Onglet de recherche qui révèle la communauté */}
        <button
          type="button"
          onClick={() => {
            setViewMode(viewMode === "community" ? "media" : "community");
          }}
          className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm ${
            viewMode === "community"
              ? "border-primary bg-primary/20 text-primary shadow-[0_0_14px_rgba(112,34,255,0.35)]"
              : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
          title="Cliquez pour afficher la communauté et rechercher des membres"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span>{viewMode === "community" ? "Communauté" : "Recherche"}</span>
          <span className="rounded-full bg-secondary/80 px-1.5 py-0.2 text-[0.65rem] font-bold text-muted-foreground">
            {members.length}
          </span>
        </button>

        {/* c. A droite : Cloche de notification + Switch Jour/Nuit */}
        <div className="flex items-center gap-2">
          {/* Cloche de notifications (vers /annonces) */}
          <Link
            to="/annonces"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/50"
            title="Notifications et annonces officielles"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unreadAnnouncements > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-bold text-destructive-foreground animate-pulse">
                {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
              </span>
            )}
          </Link>

          {/* Onglet pour changer l'apparence : Jour / Nuit */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-all hover:text-foreground hover:border-primary/50"
            title={isLightMode ? "Activer le mode Nuit" : "Activer le mode Jour"}
          >
            {isLightMode ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary fill-none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-400 fill-none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ========================================================
          2. ZONE CENTRALE (ENTRE HEADER ET FOOTER)
          ======================================================== */}
      {viewMode === "community" ? (
        /* VUE COMMUNAUTÉ (activée par l'onglet recherche) */
        <section>
          {/* Barre de recherche instantanée par nom ou serial */}
          <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="relative flex items-center">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground fill-none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, prénom ou LF-XXXX..."
                className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-9 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[0.7rem] text-muted-foreground">
              <span>{filteredMembers.length} membre{filteredMembers.length > 1 ? "s" : ""} trouvé{filteredMembers.length > 1 ? "s" : ""}</span>
              <button
                type="button"
                onClick={() => {
                  setViewMode("media");
                  setSearchQuery("");
                }}
                className="text-primary font-medium hover:underline"
              >
                ✕ Fermer la recherche
              </button>
            </div>
          </div>

          {/* Panneau publicitaire Billboard */}
          <Billboard />

          {/* Annuaire des membres */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Membres de la Communauté
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
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  Aucun membre trouvé pour "{searchQuery}"
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vérifiez l'orthographe du nom ou du numéro de série LF.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredMembers.map((m: Member, i: number) => (
                  <li
                    key={m.id}
                    className="lf-card-enter"
                    style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
                  >
                    <MemberCard member={m} roles={rolesMap.get(m.user_id) ?? []} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : (
        /* VUE ACCUEIL MÉDIA : Entièrement vierge, prête à accueillir les médias */
        <section className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          {/* Espace vierge réservé aux futurs médias */}
        </section>
      )}
    </main>
  );
}
