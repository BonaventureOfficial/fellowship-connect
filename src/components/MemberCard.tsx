import { useAvatarUrl } from "@/lib/useAvatarUrl";
import { useState } from "react";
import { AvatarViewer } from "@/components/AvatarViewer";
import { PlatinumBadge } from "@/components/PlatinumBadge";
import { FollowButton } from "@/components/FollowButton";
import { useFollowCounts } from "@/lib/follows";
import { fullName, initialsOf, type Member } from "@/lib/members";
import { useRolesMap, type AppRole } from "@/lib/roles";

export function MemberCard({
  member,
  roles,
}: {
  member: Member;
  roles?: AppRole[];
}) {
  const [open, setOpen] = useState(false);
  const avatar = useAvatarUrl(member.avatar_url);
  const verified =
  String(member.status ?? "").trim().toLocaleLowerCase("fr") ===
  "vérifié";
  const name = fullName(member) || "Membre";

  // Récupération automatique du rôle pour attribuer le bon badge
  const { rolesMap } = useRolesMap();
  const effectiveRoles = roles ?? (member.user_id ? rolesMap.get(member.user_id) ?? [] : []);
  const isCeo = effectiveRoles.includes("ceo");

  const { data: followCounts } = useFollowCounts(member.user_id);

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      {/* Avatar avec contour dégradé */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Voir la photo de ${name}`}
        className="lf-ring-gradient shrink-0 rounded-full p-[2.5px] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-card text-lg font-bold text-foreground">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            initialsOf(name)
          )}
        </div>
      </button>

      {/* Informations membre */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            {/* Badge officiel : Platinum pour le CEO, Bleu pour les membres vérifiés */}
            {verified && (
              <PlatinumBadge
                className="h-4 w-4"
                variant={isCeo ? "platinum" : "blue"}
              />
            )}
          </div>
          {/* Bouton Suivre / Abonné */}
          <FollowButton targetMember={member} />
        </div>

        <p className="mt-1 font-mono text-[0.72rem] tracking-wide text-muted-foreground">
          {member.serial ?? "LF-…"}
        </p>

        {/* Compteurs dynamiques Followers / Abonnements */}
        <div className="mt-1.5 flex items-center gap-3 text-[0.72rem] text-muted-foreground">
          <span>
            <strong className="font-semibold text-foreground">
              {followCounts ? followCounts.followersCount : 0}
            </strong>{" "}
            followers
          </span>
          <span>·</span>
          <span>
            <strong className="font-semibold text-foreground">
              {followCounts ? followCounts.followingCount : 0}
            </strong>{" "}
            abonnements
          </span>
        </div>

        {/* Statut officiel uniquement (sans étiquette textuelle CEO/Admin) */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${
              verified ? "bg-accent/20 text-accent font-bold" : "bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                verified ? "bg-accent" : "bg-muted-foreground"
              }`}
            />
            {member.status}
          </span>
        </div>
      </div>

      <AvatarViewer
        open={open}
        onOpenChange={setOpen}
        src={member.avatar_url}
        name={name}
        serial={member.serial}
      />
    </article>
  );
}
