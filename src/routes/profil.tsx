import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyRoles } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarViewer } from "@/components/AvatarViewer";
import { VerificationBadge } from "@/components/PlatinumBadge";
import { fullName, initialsOf, type Member } from "@/lib/members";
import { useFollowCounts } from "@/lib/follows";
import { lfLogo } from "@/lib/assets";
import { lfMembers } from "@/lib/assets";
import { lfCover } from "@/lib/assets";
import { useAvatarUrl } from "@/lib/useAvatarUrl";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Mon profil" },
      {
        name: "description",
        content:
          "Mettez à jour votre photo, votre nom et prénom et recevez votre Serial Number Living Fellowship.",
      },
      { property: "og:title", content: "Living Fellowship — Mon profil" },
      {
        property: "og:description",
        content:
          "Espace personnel du membre Living Fellowship : photo, identité et Serial Number.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilComponent,
});

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5;

function ProfilComponent() {
  const { user, loading } = useAuth();
  const { isCeo } = useMyRoles(user?.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sponsorInput, setSponsorInput] = useState("");
  const [savingSponsor, setSavingSponsor] = useState(false);
  const [sponsorErr, setSponsorErr] = useState<string | null>(null);
  const [sponsorOk, setSponsorOk] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);

  const { data: followCounts } = useFollowCounts(user?.id);

  const { data: member } = useQuery({
    queryKey: ["my-member", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Member | null> => {
      const { data, error } = await supabase
        .from("members")
        .select(
          "id,user_id,first_name,last_name,avatar_url,serial,status,created_at,referred_by",
        )
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Member | null) ?? null;
    },
  });
  const avatarSrc = useAvatarUrl(member?.avatar_url);

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name);
      setLastName(member.last_name);
    }
  }, [member]);

  useEffect(() => {
    if (member && !member.referred_by && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("lf_ref");
        if (stored && !sponsorInput) {
          setSponsorInput(stored);
        }
      } catch {}
    }
  }, [member]);

  const saveRow = async (patch: Partial<Member>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("members")
      .upsert(
        { user_id: user.id, ...patch },
        { onConflict: "user_id" },
      )
      .select(
        "id,user_id,first_name,last_name,avatar_url,serial,status,created_at,referred_by",
      )
      .single();
    if (error) throw error;
    queryClient.setQueryData(["my-member", user.id], data);
    queryClient.invalidateQueries({ queryKey: ["members"] });
    return data as Member;
  };

  const onPickPhoto = async (file: File) => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: signData, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr) throw signErr;

      await saveRow({ avatar_url: signData.signedUrl });
      setMsg("Photo mise à jour avec succès.");
    } catch (e: unknown) {
      setErr(
        e instanceof Error
          ? e.message
          : "Erreur lors du téléchargement de la photo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onSaveIdentity = async () => {
    if (!user) return;
    const f = firstName.trim();
    const l = lastName.trim();
    if (f.length < 2 || l.length < 2) {
      setErr("Le prénom et le nom doivent comporter au moins 2 caractères.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const updated = await saveRow({ first_name: f, last_name: l });
      if (updated?.serial) {
        setMsg(`Identité enregistrée. Votre Serial Number : ${updated.serial}`);
      } else {
        setMsg("Identité enregistrée.");
      }
    } catch (e: unknown) {
      setErr(
        e instanceof Error
          ? e.message
          : "Erreur lors de l'enregistrement de votre identité.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onLinkSponsor = async () => {
    if (!user || !member) return;
    const code = sponsorInput.trim().toUpperCase();
    if (!code) {
      setSponsorErr("Veuillez saisir un code Serial (ex. LF-0002).");
      return;
    }
    if (member.serial && code === member.serial.toUpperCase()) {
      setSponsorErr("Vous ne pouvez pas vous parrainer vous-même.");
      return;
    }
    setSavingSponsor(true);
    setSponsorErr(null);
    setSponsorOk(null);
    try {
      const { data: sponsor, error: spErr } = await supabase
        .from("members")
        .select("id,serial,first_name,last_name,status")
        .ilike("serial", code)
        .maybeSingle();

      if (spErr) throw spErr;
      if (!sponsor) {
        setSponsorErr(`Aucun membre trouvé avec le Serial ${code}.`);
        return;
      }

      await saveRow({ referred_by: code });
      try {
        localStorage.removeItem("lf_ref");
      } catch {}
      setSponsorOk(`Parrain lié avec succès : ${code} (${sponsor.first_name} ${sponsor.last_name}).`);
    } catch (e: unknown) {
      setSponsorErr(e instanceof Error ? e.message : "Erreur lors de la liaison du parrain.");
    } finally {
      setSavingSponsor(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  };

  const displayName = member ? fullName(member) : "";
  const canConfirm =
    firstName.trim().length > 1 && lastName.trim().length > 1 && !busy;

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
        <p className="lf-billboard-word mt-1 text-sm font-semibold uppercase tracking-[0.2em]">
          Personalite · Potentialite · Prosperite
        </p>
      </div>

      {/* Espace membre */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Mon profil</h2>

        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
        ) : !user ? (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              Connectez-vous pour mettre à jour votre photo, votre nom et prénom
              et recevoir votre Serial Number.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link to="/auth">Se connecter / Créer un compte</Link>
            </Button>
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link to="/parametres">Paramètres</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setViewer(true)}
                aria-label="Voir ma photo en grand"
                className="lf-ring-gradient rounded-full p-[3px] transition-transform hover:scale-[1.03]"
              >
                <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-background text-3xl font-extrabold text-foreground">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName || "Ma photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initialsOf(displayName || "LF")
                  )}
                </div>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickPhoto(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Changer la photo
              </Button>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
                  {member?.serial ?? "Serial en attente"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {member?.status ?? "Non Vérifié"}
                  <VerificationBadge isCeo={isCeo} verified={member?.status === "Vérifié"} />
                </span>
              </div>

              {/* Compteurs dynamiques Followers & Abonnements */}
              <div className="mt-3 flex items-center justify-center gap-6 rounded-2xl border border-border/80 bg-background/60 px-5 py-2.5 text-xs">
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">
                    {followCounts ? followCounts.followersCount : 0}
                  </p>
                  <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    Followers
                  </p>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">
                    {followCounts ? followCounts.followingCount : 0}
                  </p>
                  <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    Abonnements
                  </p>
                </div>
              </div>

              {/* Parrain lié */}
              {member?.referred_by && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  <span>Parrainé par :</span>
                  <span className="font-mono font-bold">{member.referred_by}</span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full"
                onClick={() => void navigate({ to: "/parametres" })}
              >
                Paramètres
              </Button>

              {isCeo && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-full font-semibold uppercase tracking-wider"
                  onClick={() => void navigate({ to: "/ceo" })}
                >
                  Espace CEO
                </Button>
              )}
            </div>

            {/* Formulaire identité */}
            <div className="mt-6 space-y-3">
              <div>
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  disabled={busy}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex : Bonaventure"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  disabled={busy}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex : Tuyisenge"
                  className="mt-1"
                />
              </div>

              {msg && <p className="text-xs text-primary">{msg}</p>}
              {err && <p className="text-xs text-destructive">{err}</p>}

              <Button
                className="w-full"
                disabled={!canConfirm}
                onClick={onSaveIdentity}
              >
                {busy
                  ? "Enregistrement…"
                  : member?.serial
                    ? "Mettre à jour mon identité"
                    : "Confirmer mon identité et générer mon Serial"}
              </Button>
            </div>

            {/* Section ajout d'un parrain (si absent) */}
            {!member?.referred_by && (
              <div className="mt-6 rounded-xl border border-dashed border-border p-4 bg-muted/20">
                <p className="text-xs font-semibold text-foreground">
                  Avez-vous un parrain Living Fellowship ?
                </p>
                <p className="mt-1 text-[0.75rem] text-muted-foreground">
                  Si un membre vous a invité, entrez son Serial Number (ex : LF-0002).
                </p>

                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="LF-0000"
                    value={sponsorInput}
                    disabled={savingSponsor}
                    onChange={(e) => setSponsorInput(e.target.value.toUpperCase())}
                    className="font-mono text-xs uppercase"
                  />
                  <Button
                    size="sm"
                    disabled={savingSponsor || !sponsorInput.trim()}
                    onClick={onLinkSponsor}
                  >
                    {savingSponsor ? "…" : "Lier"}
                  </Button>
                </div>

                {sponsorOk && <p className="mt-2 text-xs text-primary">{sponsorOk}</p>}
                {sponsorErr && <p className="mt-2 text-xs text-destructive">{sponsorErr}</p>}
              </div>
            )}

            <Button
              variant="destructive"
              className="mt-6 w-full"
              onClick={signOut}
            >
              Se déconnecter
            </Button>
          </div>
        )}
      </section>

      {/* Vision */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notre devise
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          Living Fellowship rassemble les membres autour d'une vision commune :
          développer la <strong>Personnalité</strong>, libérer la{" "}
          <strong>Potentialité</strong> et marcher vers la{" "}
          <strong>Prospérité</strong>.
        </p>
      </section>

      {/* Contact */}
      <section className="mt-6 mb-12 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contact & Support
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Une question sur votre adhésion ou vos droits d'accès ? Contactez
          l'administration Living Fellowship à{" "}
          <a
            href="mailto:contact@livingfellowship.org"
            className="text-primary hover:underline"
          >
            contact@livingfellowship.org
          </a>
          .
        </p>
      </section>

      <AvatarViewer
        open={viewer}
        onOpenChange={setViewer}
        src={avatarSrc}
        name={displayName || "Photo"}
        serial={member?.serial}
      />
    </main>
  );
}
