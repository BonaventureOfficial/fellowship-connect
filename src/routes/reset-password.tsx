import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lfLogo } from "@/lib/assets";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Nouveau mot de passe" },
      {
        name: "description",
        content: "Définissez un nouveau mot de passe pour votre compte Living Fellowship.",
      },
      { property: "og:title", content: "Living Fellowship — Nouveau mot de passe" },
      { property: "og:description", content: "Réinitialisation du mot de passe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordComponent,
});

function ResetPasswordComponent() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Le lien email contient #access_token=...&type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
      return;
    }
    // Sinon, vérifier si une session de récupération est déjà active
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setInvalid(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password !== password2) {
      setErr("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/profil" }), 1500);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 pb-24 pt-10">
      <div className="text-center">
        <img src={lfLogo.url} alt="Living Fellowship" className="mx-auto h-20 w-20 select-none" />
        <h1 className="mt-3 text-xl font-bold text-foreground">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>
      </div>

      {invalid && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-destructive">
            Ce lien est invalide ou expiré. Demandez un nouveau lien depuis la page de connexion.
          </p>
          <Button className="mt-4 w-full" onClick={() => navigate({ to: "/auth" })}>
            Retour à la connexion
          </Button>
        </div>
      )}

      {ready && !done && (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="pw1">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="pw1"
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-20"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto h-7 rounded-md px-2 text-xs font-medium text-primary hover:bg-secondary"
                aria-label={showPw ? "Cacher le mot de passe" : "Afficher le mot de passe"}
              >
                {showPw ? "Cacher" : "Afficher"}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Confirmer le mot de passe</Label>
            <Input
              id="pw2"
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Patientez…" : "Enregistrer le nouveau mot de passe"}
          </Button>
        </form>
      )}

      {done && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-accent">
            Mot de passe mis à jour. Redirection vers votre profil…
          </p>
        </div>
      )}
    </main>
  );
}
