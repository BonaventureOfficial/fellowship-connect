import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarViewer } from "@/components/AvatarViewer";
import { fullName, initialsOf, type Member } from "@/lib/members";
import lfLogo from "@/assets/lf-logo.png.asset.json";
import lfMembers from "@/assets/lf-members.png.asset.json";
import lfCover from "@/assets/lf-cover.png.asset.json";

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
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);

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

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name);
      setLastName(member.last_name);
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
        "id,user_id,first_name,last_name,avatar_url,serial,status,created_at",
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
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (sErr) throw sErr;
      await saveRow({ avatar_url: signed.signedUrl });
      setMsg("Photo de profil mise à jour.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Échec de l'envoi de la photo.");
    } finally {
      setBusy(false);
    }
  };

  const confirmIdentity = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const saved = await saveRow({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setMsg(
        saved?.serial
          ? `Inscription confirmée. Votre Serial Number est ${saved.serial}.`
          : "Enregistré.",
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setBusy(false);
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
                  {member?.avatar_url ? (
                    <img
                      src={member.avatar_url}
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

              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
                  {member?.serial ?? "Serial en attente"}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {member?.status ?? "Non Vérifié"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                />
              </div>
            </div>

            {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
            {msg && <p className="mt-3 text-xs text-accent">{msg}</p>}

            <Button
              className="mt-4 w-full"
              disabled={!canConfirm}
              onClick={() => void confirmIdentity()}
            >
              {member?.serial
                ? "Mettre à jour mon nom et prénom"
                : "Confirmer mon nom et prénom"}
            </Button>

            <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
              La vérification du membre est une étape à suivre bientôt : votre
              statut reste « Non Vérifié ».
            </p>

            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Se déconnecter
            </button>

            <AvatarViewer
              open={viewer}
              onOpenChange={setViewer}
              src={member?.avatar_url ?? null}
              name={displayName || "Mon profil"}
              serial={member?.serial ?? null}
            />
          </div>
        )}
      </section>

      {/* À propos */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">À propos</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Living Fellowship rassemble ses membres autour de trois piliers : la
          personnalité, la potentialité et la prosperité. Nous accompagnons
          chaque membre dans son épanouissement personnel et collectif.
        </p>
      </section>

      {/* Image de couverture */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-border">
        <img
          src={lfCover.url}
          alt="Living Fellowship"
          className="w-full object-cover"
        />
      </section>

      {/* Coordonnées */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Contact</h2>
        <dl className="mt-2 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Siège</dt>
            <dd className="text-foreground">Burundi-Bujumbura</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">livingfellowship2024@gmail.com</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
