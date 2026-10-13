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

type Panel = "admins" | "review" | "log" | "my-fellowship" | "verify" | "email" | "password" | "delete" | null;

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
            title="My Fellowship"
            subtitle={
              member?.status === "Vérifié"
                ? "Parrainez des membres avec votre Serial Number"
                : "Vérification requise pour parrainer"
            }
            open={panel === "my-fellowship"}
            onToggle={() =>
              setPanel(panel === "my-fellowship" ? null : "my-fellowship")
            }
          >
            <MyFellowshipSection
              member={member ?? null}
              onGoToVerify={() => setPanel("verify")}
            />
          </SettingItem>

          <SettingItem
            title="Vérifier Votre Compte"
            subtitle={
              member?.status === "Vérifié"
                ? "Compte déjà vérifié"
                : "Demande de vérification de compte"
            }
            open={panel === "verify"}
            onToggle={() => setPanel(panel === "verify" ? null : "verify")}
          >
            <VerificationSection userId={user.id} member={member ?? null} />
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
  onSubmitted,
}: {
  userId: string;
  member: Member | null;
  onSubmitted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [fonction, setFonction] = useState("");
  const [serial, setSerial] = useState("");
  const [portrait, setPortrait] = useState<File | null>(null);
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
      // Bloquer si une demande est déjà en attente
      const { data: existingPending, error: checkErr } = await supabase
        .from("verification_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("state", "En attente")
        .maybeSingle();

      if (checkErr) throw checkErr;
      if (existingPending) {
        throw new Error(
          "Vous avez déjà une demande de vérification en attente. Une seule demande est autorisée.",
        );
      }

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
      if (!portrait) throw new Error("Veuillez ajouter une photo portrait.");
      if (!portrait.type.startsWith("image/")) throw new Error("La photo portrait doit être une image.");
      if (portrait.size > 10 * 1024 * 1024) throw new Error("La photo portrait ne doit pas dépasser 10 Mo.");
      const ext = (portrait.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${userId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("portraits").upload(path, portrait, { contentType: portrait.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("verification_requests").insert({
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_place: birthPlace.trim(),
        birth_date: isoDate,
        lf_function: fonction.trim(),
        serial: serial.trim(),
        portrait_path: path,
      } as never);
      if (error) throw error;
      setMsg(
        "Demande de vérification envoyée. Elle sera traitée prochainement.",
      );
      void queryClient.invalidateQueries({ queryKey: ["my-verification-request", userId] });
      void queryClient.invalidateQueries({ queryKey: ["verification-requests"] });
      onSubmitted?.();
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
      <div className="space-y-1.5">
        <Label htmlFor="v-portrait">Ajouter photo portrait (max 10 Mo)</Label>
        <Input
          id="v-portrait"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > 10 * 1024 * 1024) {
              setErr("La photo portrait ne doit pas dépasser 10 Mo.");
              e.target.value = "";
              setPortrait(null);
              return;
            }
            setErr(null);
            setPortrait(f);
          }}
        />
        {portrait && (
          <img src={URL.createObjectURL(portrait)} alt="Aperçu portrait" className="mt-2 h-28 w-24 rounded-lg object-cover" />
        )}
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
      if (!newEmail.includes("@")) throw new Error("Nouvel email invalide.");
      if (oldEmail.trim().toLowerCase() !== currentEmail.toLowerCase()) {
        throw new Error("L'ancien email ne correspond pas à votre adresse actuelle.");
      }
      if (oldEmail.trim().toLowerCase() === newEmail.trim().toLowerCase()) {
        throw new Error("Le nouvel email doit être différent de l'ancien.");
      }
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setMsg(
        "Un email de confirmation a été envoyé à vos deux adresses. Confirmez pour finaliser le changement.",
      );
      setOldEmail("");
      setNewEmail("");
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
          placeholder={currentEmail}
          value={oldEmail}
          onChange={(e) => setOldEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="e-new">Nouvel email</Label>
        <Input
          id="e-new"
          type="email"
          placeholder="nouveau@livingfellowship.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
      </div>
      <Feedback err={err} msg={msg} />
      <Button disabled={busy} onClick={() => void submit()}>
        Mettre à jour l'email
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
      if (newPassword.length < 8) {
        throw new Error("Le nouveau mot de passe doit comporter au moins 8 caractères.");
      }
      const check = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (check.error) throw new Error("Ancien mot de passe incorrect.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMsg("Mot de passe mis à jour avec succès.");
      setOldPassword("");
      setNewPassword("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Échec du changement de mot de passe.");
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
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-new">Nouveau mot de passe</Label>
        <Input
          id="p-new"
          type="password"
          autoComplete="new-password"
          placeholder="Au moins 8 caractères"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <Feedback err={err} msg={msg} />
      <Button disabled={busy} onClick={() => void submit()}>
        Mettre à jour le mot de passe
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
      if (!accepted) throw new Error("Veuillez cocher la confirmation.");
      await deleteMyAccount();
      await onDeleted();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Échec de la suppression.");
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        La suppression de votre compte effacera votre profil, vos annonces et toutes
        les données associées. Cette action est irréversible.
      </p>
      <label className="flex items-start gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          J'ai compris que cette action est définitive. Je n'aurai plus de profil
          au sein de Living Fellowship et je ne demanderai pas la récupération de
          mes données.
        </span>
      </label>
      <Feedback err={err} msg={null} />
      <Button variant="destructive" disabled={!accepted || busy} onClick={() => void submit()}>
        Supprimer mon compte définitivement
      </Button>
    </div>
  );
}

function AdminManager() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const admins = useQuery({
    queryKey: ["admins-list"],
    queryFn: listAdmins,
  });

  const addMut = useMutation({
    mutationFn: addAdmin,
    onSuccess: (res) => {
      setMsg(res.message);
      setEmail("");
      void admins.refetch();
      void qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Échec."),
  });

  const removeMut = useMutation({
    mutationFn: removeAdmin,
    onSuccess: (res) => {
      setMsg(res.message);
      void admins.refetch();
      void qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Échec."),
  });

  return (
    <div className="grid gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="adm-email">Email de l'utilisateur à nommer Admin</Label>
        <div className="flex gap-2">
          <Input
            id="adm-email"
            type="email"
            placeholder="membre@livingfellowship.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button disabled={!email.includes("@") || addMut.isPending} onClick={() => { setErr(null); setMsg(null); addMut.mutate(email.trim()); }}>
            {addMut.isPending ? "Ajout…" : "Ajouter comme Admin"}
          </Button>
        </div>
      </div>
      <Feedback err={err} msg={msg} />

      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Administrateurs actuels ({admins.data?.length ?? 0})
      </h3>
      <ul className="space-y-2">
        {(admins.data ?? []).map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">{a.full_name || a.email}</p>
              <p className="text-xs text-muted-foreground">{a.email}</p>
            </div>
            {!a.is_ceo && (
              <Button size="sm" variant="outline" disabled={removeMut.isPending} onClick={() => removeMut.mutate(a.user_id)}>
                Retirer Admin
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

  // Dé-doublonnage : ne conserver qu'une seule demande en attente par utilisateur
  const uniqueRequests = Array.from(
    (reqs.data ?? []).reduce((map, item) => {
      if (!map.has(item.user_id)) {
        map.set(item.user_id, item);
      } else {
        // En cas de doublons en attente, conserver celle qui a le plus d'approbations
        const existing = map.get(item.user_id)!;
        if ((item.approvals_count ?? 0) > (existing.approvals_count ?? 0)) {
          map.set(item.user_id, item);
        }
      }
      return map;
    }, new Map<string, NonNullable<typeof reqs.data>[number]>()).values(),
  );

  if (reqs.isLoading) return <p className="text-xs text-muted-foreground">Chargement…</p>;
  if (!uniqueRequests.length) return <p className="text-xs text-muted-foreground">Aucune demande en attente.</p>;
  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        Il faut {REQUIRED_APPROVALS} validations d'administrateurs différents pour vérifier un compte.
      </p>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {uniqueRequests.map((r) => {
        const voted = myVotes.data?.get(r.id);
        const own = r.user_id === myId;
        return (
          <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
            <PortraitThumb path={(r as { portrait_path?: string | null }).portrait_path ?? null} />
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

function MyFellowshipSection({
  member,
  onGoToVerify,
}: {
  member: Member | null;
  onGoToVerify: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(false);

  const isVerified = member?.status === "Vérifié";
  const serial = member?.serial;

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://livingfellowship2026.com";

  const referralUrl = serial
    ? `${origin}/auth?ref=${encodeURIComponent(serial)}`
    : "";

  const handleCopyLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // presse-papier non accessible
    }
  };

  const handleCopySerial = async () => {
    if (!serial) return;
    try {
      await navigator.clipboard.writeText(serial);
      setCopiedSerial(true);
      setTimeout(() => setCopiedSerial(false), 2500);
    } catch {
      // presse-papier non accessible
    }
  };

  const handleShare = async () => {
    if (!referralUrl) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Rejoignez Living Fellowship",
          text: `Rejoignez Living Fellowship avec mon Serial Number (${serial}) !`,
          url: referralUrl,
        });
      } catch {
        // annulation du partage
      }
    } else {
      void handleCopyLink();
    }
  };

  if (!isVerified) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Éligibilité au parrainage
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            Statut actuel : {member?.status ?? "Non Vérifié"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Seuls les membres ayant obtenu le badge de vérification officiel peuvent parrainer de nouveaux membres au sein de Living Fellowship.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onGoToVerify}
          >
            Faire une demande de vérification
          </Button>
        </div>
      </div>
    );
  }

  if (!confirmed) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              ✓ Compte Vérifié — Éligible
            </span>
            {serial && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.7rem] font-bold text-primary">
                {serial}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">
            Votre badge de vérification est actif. Vous êtes éligible pour parrainer et inviter de nouveaux membres.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            En confirmant, le système génère votre lien unique de parrainage rattaché à votre Serial Number officiel.
          </p>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={!serial}
          onClick={() => setConfirmed(true)}
        >
          {serial
            ? "Confirmer et afficher mon lien de parrainage"
            : "Attribution du Serial en cours…"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            ✓ Parrain officiel Living Fellowship
          </span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {serial}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Votre lien de parrainage est actif. Tout membre qui s’inscrit avec ce lien aura votre Serial Number automatiquement associé.
        </p>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground">
          Lien de parrainage personnalisé
        </Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            type="text"
            readOnly
            value={referralUrl}
            className="font-mono text-xs"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            type="button"
            variant={copiedLink ? "secondary" : "default"}
            size="sm"
            onClick={handleCopyLink}
          >
            {copiedLink ? "Copié !" : "Copier"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopySerial}
        >
          {copiedSerial ? "Serial copié !" : `Copier Serial (${serial})`}
        </Button>

        {typeof navigator !== "undefined" &&
          typeof navigator.share === "function" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              Partager…
            </Button>
          )}
      </div>

      <div className="rounded-lg bg-muted/50 p-2.5 text-[0.72rem] text-muted-foreground">
        💡 Astuce : Vous pouvez aussi communiquer simplement votre Serial <span className="font-semibold text-foreground">{serial}</span> pour qu'il soit saisi lors de l'inscription ou ajouté plus tard sur le profil.
      </div>

      {serial && <MyFellowshipReferrals serial={serial} />}
    </div>
  );
}

                type="button"
                variant="outline"
                size="sm"
                disabled={page + 1 >= pageCount || isPageLoading}
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VerificationSection({
  userId,
  member,
}: {
  userId: string;
  member: Member | null;
}) {
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

  if (member?.status === "Vérifié") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
        <p className="text-sm font-semibold text-primary">Compte Vérifié</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Votre compte est déjà vérifié et actif au sein de Living Fellowship.
        </p>
      </div>
    );
  }

  if (q.isLoading) {
    return <p className="text-xs text-muted-foreground">Vérification du statut…</p>;
  }

  const req = q.data;

  // Si une demande est en attente, n'afficher QUE le statut (pas de nouveau formulaire)
  if (req && req.state === "En attente") {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Demande en attente de validation
          </p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            En attente
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Votre demande de vérification est en cours d'examen par les administrateurs. Une seule demande est autorisée tant que celle-ci n'est pas traitée.
        </p>
        <ApprovalProgress approvals={req.approvals_count} refusals={req.refusals_count} />
        <p className="mt-3 text-[0.7rem] text-muted-foreground">
          Soumise le {new Date(req.created_at).toLocaleDateString("fr-FR")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {req && req.state === "Refusée" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Votre précédente demande a été refusée ({req.refusals_count} avis défavorables). Vous pouvez soumettre une nouvelle demande ci-dessous.
        </div>
      )}
      <VerifyForm userId={userId} member={member} onSubmitted={() => void q.refetch()} />
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

function PortraitThumb({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    void supabase.storage.from("portraits").createSignedUrl(path, 3600).then(({ data }) => {
      if (alive) setUrl(data?.signedUrl ?? null);
    });
    return () => {
      alive = false;
    };
  }, [path]);
  if (!path) return <p className="mb-2 text-xs text-muted-foreground">Pas de photo portrait.</p>;
  if (!url) return <div className="mb-2 h-28 w-24 animate-pulse rounded-lg bg-muted" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Photo portrait" className="mb-2 h-28 w-24 rounded-lg object-cover" />
    </a>
  );
}