import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { useMyRoles } from "@/lib/roles";
import { addAdmin, listAdmins, removeAdmin } from "@/lib/ceo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlatinumBadge } from "@/components/PlatinumBadge";

export const Route = createFileRoute("/ceo")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Espace CEO" },
      {
        name: "description",
        content:
          "Espace réservé au CEO de Living Fellowship : gestion des admins, publication des annonces et gestion des membres.",
      },
      { property: "og:title", content: "Living Fellowship — Espace CEO" },
      {
        property: "og:description",
        content:
          "Console privée du CEO Living Fellowship : admins, annonces et membres.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CeoComponent,
});

function CeoComponent() {
  const { user, loading } = useAuth();
  const { isCeo, isLoading } = useMyRoles(user?.id);
  const navigate = useNavigate();

  const fetchAdmins = useServerFn(listAdmins);
  const doAdd = useServerFn(addAdmin);
  const doRemove = useServerFn(removeAdmin);

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const admins = useQuery({
    queryKey: ["admins"],
    enabled: !!user && isCeo,
    queryFn: () => fetchAdmins(),
  });

  const addMut = useMutation({
    mutationFn: (value: string) => doAdd({ data: { email: value } }),
    onSuccess: (r) => {
      setMsg(`${r.email} est maintenant administrateur.`);
      setErr(null);
      setEmail("");
      void admins.refetch();
    },
    onError: (e: unknown) =>
      setErr(e instanceof Error ? e.message : "Échec de l'ajout."),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => doRemove({ data: { userId } }),
    onSuccess: () => {
      setMsg("Administrateur retiré.");
      void admins.refetch();
    },
  });

  if (loading || isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-10">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (!user || !isCeo) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-10">
        <h1 className="text-lg font-bold text-foreground">Accès refusé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cet espace est réservé au CEO de Living Fellowship.
        </p>
        <Button className="mt-4" onClick={() => void navigate({ to: "/" })}>
          Retour à l'accueil
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Espace CEO</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Console privée de direction
          </p>
        </div>
        <PlatinumBadge />
      </div>

      {/* 1. Admins */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          1. Ajouter des admins
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          La personne doit déjà avoir un compte Living Fellowship.
        </p>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="adminEmail">Email du membre</Label>
          <Input
            id="adminEmail"
            type="email"
            value={email}
            placeholder="membre@email.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
        {msg && <p className="mt-3 text-xs text-accent">{msg}</p>}

        <Button
          className="mt-3 w-full"
          disabled={!email.includes("@") || addMut.isPending}
          onClick={() => {
            setErr(null);
            setMsg(null);
            addMut.mutate(email.trim());
          }}
        >
          {addMut.isPending ? "Ajout…" : "Nommer administrateur"}
        </Button>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Équipe de direction
          </p>
          <ul className="mt-2 space-y-2">
            {(admins.data ?? []).map((a) => (
              <li
                key={`${a.user_id}-${a.role}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{a.email}</p>
                  <p className="text-[0.68rem] uppercase tracking-wide text-primary">
                    {a.role}
                  </p>
                </div>
                {a.role === "admin" && (
                  <button
                    type="button"
                    className="text-xs text-destructive underline-offset-4 hover:underline"
                    onClick={() => removeMut.mutate(a.user_id)}
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
            {admins.isLoading && (
              <li className="text-xs text-muted-foreground">Chargement…</li>
            )}
          </ul>
        </div>
      </section>

      {/* 2 & 3 */}
      <section className="mt-4 rounded-2xl border border-dashed border-border bg-card/50 p-5">
        <h2 className="text-sm font-semibold text-foreground">
          2. Publier une annonce
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Bientôt disponible</p>
        <Button variant="outline" className="mt-3 w-full" disabled>
          Bientôt disponible
        </Button>
      </section>

      <section className="mt-4 rounded-2xl border border-dashed border-border bg-card/50 p-5">
        <h2 className="text-sm font-semibold text-foreground">
          3. Gérer tous les membres
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Bientôt disponible</p>
        <Button variant="outline" className="mt-3 w-full" disabled>
          Bientôt disponible
        </Button>
      </section>

      <Link
        to="/profil"
        className="mt-6 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Retour au profil
      </Link>
    </main>
  );
}
