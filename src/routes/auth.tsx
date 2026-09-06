import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lfLogo } from "@/lib/assets";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Connexion" },
      {
        name: "description",
        content:
          "Connectez-vous ou créez votre compte membre Living Fellowship pour obtenir votre Serial Number.",
      },
      { property: "og:title", content: "Living Fellowship — Connexion" },
      {
        property: "og:description",
        content: "Espace membre Living Fellowship.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthComponent,
});

function AuthComponent() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/profil" });
        else setMsg("Vérifiez votre boîte mail pour confirmer votre compte.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate({ to: "/profil" });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Connexion Google impossible.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 pb-24 pt-10">
      <div className="text-center">
        <img
          src={lfLogo.url}
          alt="Living Fellowship"
          className="mx-auto h-20 w-20 select-none"
        />
        <h1 className="mt-3 text-xl font-bold text-foreground">
          Espace membre
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Créez votre compte pour obtenir votre Serial Number."
            : "Connectez-vous à votre compte Living Fellowship."}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err && <p className="text-xs text-destructive">{err}</p>}
        {msg && <p className="text-xs text-accent">{msg}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy
            ? "Patientez…"
            : mode === "signup"
              ? "Créer mon compte"
              : "Se connecter"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={google}
        >
          Continuer avec Google
        </Button>

        <button
          type="button"
          className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup"
            ? "J'ai déjà un compte — Se connecter"
            : "Créer un nouveau compte"}
        </button>
      </form>
    </main>
  );
}
