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
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMyRoles } from "@/lib/roles";
import { addAdmin, listAdmins, removeAdmin } from "@/lib/ceo.functions";

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

type Panel = "admins" | "review" | "log" | "verify" | "email" | "password" | "delete" | null;

function ParametresComponent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const { isCeo, isAdmin } = useMyRoles(user?.id);

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
          {isCeo && (
            <SettingItem
              title="Add Admin"
              subtitle="Nommer ou révoquer des administrateurs"
              open={panel === "admins"}
              onToggle={() => setPanel(panel === "admins" ? null : "admins")}
            >
              <AdminManager />
            </SettingItem>
          )}
          {isAdmin && (
            <SettingItem
              title="Valider les comptes"
              subtitle="4 validations d'admins requises par compte"
              open={panel === "review"}
              onToggle={() => setPanel(panel === "review" ? null : "review")}
            >
              <ReviewRequests myId={user.id} />
            </SettingItem>
          )}
          {isAdmin && (
            <SettingItem
              title="Journal de sécurité"
              subtitle="Qui a validé, refusé, publié ou changé les rôles"
              open={panel === "log"}
              onToggle={() => setPanel(panel === "log" ? null : "log")}
            >
              <AuditLog />
            </SettingItem>
          )}
          <SettingItem
            title="Vérifier Votre Compte"
            subtitle="Envoyer une demande de vérification"
            open={panel === "verify"}
            onToggle={() => setPanel(panel === "verify" ? null : "verify")}
          >
            <MyRequestStatus userId={user.id} />
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
        !birthDate.trim() ||
        !fonction.trim() ||
        !serial.trim()
      ) {
        throw new Error("Veuillez remplir tous les champs du formulaire.");
      }
      const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(birthDate.trim());
      const d = m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`) : null;
      if (!m || !d || isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3]) || d > new Date()) {
        throw new Error("Date de naissance invalide. Format : Année/Mois/Jour (ex : 1998/05/21).");
      }
      const isoDate = `${m[1]}-${m[2]}-${m[3]}`;
      const { error } = await supabase.from("verification_requests").insert({
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_place: birthPlace.trim(),
        birth_date: isoDate,
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
            inputMode="numeric"
            placeholder="Année/Mois/Jour (ex : 1998/05/21)"
            maxLength={10}
            value={birthDate}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
              const parts = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean);
              setBirthDate(parts.join("/"));
            }}
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


function AdminManager() {
  const fetchAdmins = useServerFn(listAdmins);
  const doAdd = useServerFn(addAdmin);
  const doRemove = useServerFn(removeAdmin);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const admins = useQuery({ queryKey: ["admins"], queryFn: () => fetchAdmins() });
  const addMut = useMutation({
    mutationFn: (v: string) => doAdd({ data: { email: v } }),
    onSuccess: (r) => {
      setMsg(`${r.email} est maintenant administrateur.`);
      setErr(null);
      setEmail("");
      void admins.refetch();
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Échec de l'ajout."),
  });
  const removeMut = useMutation({
    mutationFn: (userId: string) => doRemove({ data: { userId } }),
    onSuccess: () => {
      setMsg("Administrateur révoqué.");
      void admins.refetch();
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Échec."),
  });
  return (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="a-email">Email du membre</Label>
        <Input id="a-email" type="email" value={email} placeholder="membre@email.com" onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Feedback err={err} msg={msg} />
      <Button disabled={!email.includes("@") || addMut.isPending} onClick={() => { setErr(null); setMsg(null); addMut.mutate(email.trim()); }}>
        {addMut.isPending ? "Ajout…" : "Ajouter comme Admin"}
      </Button>
      <ul className="space-y-2">
        {(admins.data ?? []).map((a) => (
          <li key={`${a.user_id}-${a.role}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{a.email}</p>
              <p className="text-[0.68rem] uppercase tracking-wide text-primary">{a.role}</p>
            </div>
            {a.role === "admin" && (
              <Button size="sm" variant="outline" disabled={removeMut.isPending} onClick={() => removeMut.mutate(a.user_id)}>
                Révoquer
              </Button>
            )}
          </li>
        ))}
        {admins.isLoading && <li className="text-xs text-muted-foreground">Chargement…</li>}
      </ul>
    </div>
  );
}

const REQUIRED_APPROVALS = 4;

function ReviewRequests({ myId }: { myId: string }) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const reqs = useQuery({
    queryKey: ["verification-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("state", "En attente")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const myVotes = useQuery({
    queryKey: ["my-votes", myId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_votes")
        .select("request_id,approve")
        .eq("admin_id", myId);
      if (error) throw error;
      return new Map((data ?? []).map((v) => [v.request_id, v.approve]));
    },
  });
  const review = useMutation({
    mutationFn: async (v: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("review_verification", {
        _request_id: v.id,
        _approve: v.approve,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setErr(null);
      void reqs.refetch();
      void myVotes.refetch();
      void qc.invalidateQueries({ queryKey: ["members"] });
      void qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Échec."),
  });
  if (reqs.isLoading) return <p className="text-xs text-muted-foreground">Chargement…</p>;
  if (!reqs.data?.length) return <p className="text-xs text-muted-foreground">Aucune demande en attente.</p>;
  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        Il faut {REQUIRED_APPROVALS} validations d'administrateurs différents pour vérifier un compte.
      </p>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {reqs.data.map((r) => {
        const voted = myVotes.data?.get(r.id);
        const own = r.user_id === myId;
        return (
          <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold text-foreground">{r.first_name} {r.last_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{r.serial}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Né(e) à {r.birth_place} le {r.birth_date.replace(/-/g, "/")} · {r.lf_function}
            </p>
            <ApprovalProgress approvals={r.approvals_count} refusals={r.refusals_count} />
            {own ? (
              <p className="mt-2 text-xs text-muted-foreground">C'est votre propre demande.</p>
            ) : voted !== undefined ? (
              <p className="mt-2 text-xs text-accent">
                Vous avez déjà {voted ? "validé" : "refusé"} cette demande.
              </p>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, approve: true })}>Valider</Button>
                <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, approve: false })}>Refuser</Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ApprovalProgress({ approvals, refusals }: { approvals: number; refusals: number }) {
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: REQUIRED_APPROVALS }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < approvals ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {approvals}/{REQUIRED_APPROVALS} validateurs
        {refusals > 0 ? ` · ${refusals} refus` : ""}
      </p>
    </div>
  );
}

function MyRequestStatus({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["my-verification-request", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("id,state,approvals_count,refusals_count,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (!q.data) return null;
  const r = q.data;
  return (
    <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-sm font-semibold text-foreground">
        Ma demande : <span className="text-primary">{r.state}</span>
      </p>
      <ApprovalProgress approvals={r.approvals_count} refusals={r.refusals_count} />
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  verification_approve: "a validé la demande de",
  verification_refuse: "a refusé la demande de",
  account_verified: "a donné la 4e validation — compte vérifié :",
  account_refused: "a donné le 4e refus — demande refusée :",
  announcement_publish: "a publié une annonce",
  announcement_edit: "a modifié une annonce",
  announcement_delete: "a supprimé une annonce",
  role_grant_admin: "a nommé Admin",
  role_revoke_admin: "a révoqué l'Admin",
};

function AuditLog() {
  const log = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id,actor_id,action,target_user_id,details,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = new Set<string>();
      for (const e of data ?? []) {
        if (e.actor_id) ids.add(e.actor_id);
        if (e.target_user_id) ids.add(e.target_user_id);
      }
      const { data: ms } = ids.size
        ? await supabase.from("members").select("user_id,first_name,last_name,serial").in("user_id", [...ids])
        : { data: [] as { user_id: string; first_name: string; last_name: string; serial: string | null }[] };
      const names = new Map(
        (ms ?? []).map((m) => [m.user_id, `${m.first_name} ${m.last_name}`.trim() || m.serial || "Membre"]),
      );
      return (data ?? []).map((e) => ({ ...e, names }));
    },
  });
  if (log.isLoading) return <p className="text-xs text-muted-foreground">Chargement…</p>;
  if (log.error) return <p className="text-xs text-destructive">Journal indisponible.</p>;
  if (!log.data?.length) return <p className="text-xs text-muted-foreground">Aucune action enregistrée.</p>;
  return (
    <ul className="space-y-2">
      {log.data.map((e) => {
        const d = (e.details ?? {}) as Record<string, unknown>;
        const actor = e.actor_id ? e.names.get(e.actor_id) ?? "Administrateur" : "Système";
        const target = e.target_user_id
          ? e.names.get(e.target_user_id) ?? (typeof d["email"] === "string" ? d["email"] : "un membre")
          : typeof d["title"] === "string" && d["title"]
            ? `« ${d["title"]} »`
            : "";
        return (
          <li key={e.id} className="rounded-xl border border-border px-3 py-2">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{actor}</span> {ACTION_LABELS[e.action] ?? e.action}{" "}
              <span className="font-semibold">{target}</span>
            </p>
            <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
              {new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
