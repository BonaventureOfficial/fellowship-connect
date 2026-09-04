import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Member } from "@/lib/members";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Paramètres du compte" },
      {
        name: "description",
        content:
          "Vérifiez votre compte, modifiez votre email ou votre mot de passe et gérez la suppression de votre compte Living Fellowship.",
      },
      { property: "og:title", content: "Living Fellowship — Paramètres" },
      {
        property: "og:description",
        content:
          "Demande de vérification, changement d'email et de mot de passe, suppression du compte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParametresComponent,
});

const FONCTIONS = [
  "Représentant(e)",
  "Vice Représentant(e)",
  "Secrétaire",
  "Trésorier(ère)",
  "Staff d'arbitrage",
  "Membre Fondateur",
  "Membre",
];

type Panel = "verify" | "email" | "password" | "delete" | null;

function ParametresComponent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);

  const { data: member } = useQuery({
    queryKey: ["my-member", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Member | null> => {
      const { data, error } = await supabase
        .from("members")
        .select(
          "id,user_id,first_name,last_name,avatar_url,serial,status,created_at",
        )
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Member | null) ?? null;
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      <h1 className="text-xl font-bold text-foreground">Paramètres</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gérez la vérification, la sécurité et la suppression de votre compte.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement…</p>
      ) : !user ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour accéder aux paramètres de votre compte.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link to="/auth">Se connecter / Créer un compte</Link>
          </Button>
        </section>
      ) : (
        <div className="mt-5 space-y-3">
          <SettingItem
            title="Vérifier Votre Compte"
            subtitle="Envoyer une demande de vérification"
            open={panel === "verify"}
            onToggle={() => setPanel(panel === "verify" ? null : "verify")}
          >
            <VerifyForm userId={user.id} member={member ?? null} />
          </SettingItem>

          <SettingItem
            title="Changer d'email"
            subtitle="Confirmez d'abord votre ancien email"
            open={panel === "email"}
            onToggle={() => setPanel(panel === "email" ? null : "email")}
          >
            <EmailForm currentEmail={user.email ?? ""} />
          </SettingItem>

          <SettingItem
            title="Changer de mot de passe"
            subtitle="Confirmez d'abord votre ancien mot de passe"
            open={panel === "password"}
            onToggle={() => setPanel(panel === "password" ? null : "password")}
          >
            <PasswordForm email={user.email ?? ""} />
          </SettingItem>

          <SettingItem
            title="Supprimer mon compte"
            subtitle="Action définitive et irréversible"
            danger
            open={panel === "delete"}
            onToggle={() => setPanel(panel === "delete" ? null : "delete")}
          >
            <DeleteForm
              onDeleted={async () => {
                await supabase.auth.signOut();
                queryClient.clear();
                void navigate({ to: "/", replace: true });
              }}
            />
          </SettingItem>
        </div>
      )}
    </main>
  );
}

function SettingItem({
  title,
  subtitle,
  open,
  onToggle,
  danger,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-card ${
        danger ? "border-destructive/40" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span>
          <span
            className={`block text-sm font-semibold ${
              danger ? "text-destructive" : "text-foreground"
            }`}
          >
            {title}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {subtitle}
          </span>
        </span>
        <span
          className={`text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </section>
  );
}

function Feedback({ err, msg }: { err: string | null; msg: string | null }) {
  return (
    <>
      {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
      {msg && <p className="mt-3 text-xs text-accent">{msg}</p>}
    </>
  );
}

function VerifyForm({
  userId,
  member,
}: {
  userId: string;
  member: Member | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [fonction, setFonction] = useState("");
  const [serial, setSerial] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setFirstName((v) => v || member.first_name);
      setLastName((v) => v || member.last_name);
      setSerial((v) => v || member.serial || "");
    }
  }, [member]);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !birthPlace.trim() ||
        !birthDate ||
        !fonction.trim() ||
        !serial.trim()
      ) {
        throw new Error("Veuillez remplir tous les champs du formulaire.");
      }
      const { error } = await supabase.from("verification_requests").insert({
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_place: birthPlace.trim(),
        birth_date: birthDate,
        lf_function: fonction.trim(),
        serial: serial.trim(),
      });
      if (error) throw error;
      setMsg(
        "Demande de vérification envoyée. Elle sera traitée prochainement.",
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Échec de l'envoi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="v-first">Prénom</Label>
          <Input
            id="v-first"
            value={firstName}
            maxLength={80}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-last">Nom</Label>
          <Input
            id="v-last"
            value={lastName}
            maxLength={80}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="v-place">Lieu de naissance</Label>
          <Input
            id="v-place"
            value={birthPlace}
            maxLength={120}
            placeholder="Ex : Bujumbura"
            onChange={(e) => setBirthPlace(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-date">Date de naissance</Label>
          <Input
            id="v-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-fn">Fonction dans LF</Label>
        <select
          id="v-fn"
          value={fonction}
          onChange={(e) => setFonction(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="">Choisir une fonction…</option>
          {FONCTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-serial">Serial Number</Label>
        <Input
          id="v-serial"
          value={serial}
          maxLength={20}
          placeholder="LF-0001"
          onChange={(e) => setSerial(e.target.value)}
        />
      </div>
      <Feedback err={err} msg={msg} />
      <Button disabled={busy} onClick={() => void submit()}>
        Envoyer la demande de Vérification
      </Button>
    </div>
  );
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [oldEmail, setOldEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (
        oldEmail.trim().toLowerCase() !== currentEmail.trim().toLowerCase()
      ) {
        throw new Error("L'ancien email ne correspond pas à votre compte.");
      }
      if (!/^\S+@\S+\.\S+$/.test(newEmail.trim())) {
        throw new Error("Nouvel email invalide.");
      }
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (error) throw error;
      setMsg(
        "Un lien de confirmation a été envoyé à votre nouvelle adresse email.",
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Échec du changement d'email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="e-old">Ancien email</Label>
        <Input
          id="e-old"
          type="email"
          value={oldEmail}
          maxLength={255}
          onChange={(e) => setOldEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="e-new">Nouvel email</Label>
        <Input
          id="e-new"
          type="email"
          value={newEmail}
          maxLength={255}
          onChange={(e) => setNewEmail(e.target.value)}
        />
      </div>
      <Feedback err={err} msg={msg} />
      <Button disabled={busy} onClick={() => void submit()}>
        Changer mon email
      </Button>
    </div>
  );
}

function PasswordForm({ email }: { email: string }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (newPassword.length < 6) {
        throw new Error(
          "Le nouveau mot de passe doit contenir au moins 6 caractères.",
        );
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signErr) throw new Error("Ancien mot de passe incorrect.");
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setOldPassword("");
      setNewPassword("");
      setMsg("Mot de passe mis à jour.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Échec de la mise à jour.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="p-old">Ancien mot de passe</Label>
        <Input
          id="p-old"
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-new">Nouveau mot de passe</Label>
        <Input
          id="p-new"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <Feedback err={err} msg={msg} />
      <Button disabled={busy} onClick={() => void submit()}>
        Changer mon mot de passe
      </Button>
    </div>
  );
}

function DeleteForm({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await deleteMyAccount({ data: { confirm: true } });
      await onDeleted();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Échec de la suppression.");
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        En supprimant mon compte, je reconnais qu'il s'agit d'une décision
        strictement personnelle. Je ne réclame aucune part de mes contributions
        au sein de Living Fellowship et je ne demanderai pas la récupération de
        ce compte, qui est supprimé de façon définitive.
      </p>
      <label className="flex items-start gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-current"
        />
        <span>J'accepte ces conditions.</span>
      </label>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button
        variant="destructive"
        disabled={!accepted || busy}
        onClick={() => void submit()}
      >
        Supprimer définitivement mon compte
      </Button>
    </div>
  );
}
