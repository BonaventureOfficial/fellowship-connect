import { useState } from "react";
import { AvatarViewer } from "@/components/AvatarViewer";
import { PlatinumBadge } from "@/components/PlatinumBadge";
import { fullName, initialsOf, type Member } from "@/lib/members";
import type { AppRole } from "@/lib/roles";

export function MemberCard({
  member,
  roles = [],
}: {
  member: Member;
  roles?: AppRole[];
}) {
  const [open, setOpen] = useState(false);
  const isCeo = roles.includes("ceo");
  const isAdmin = roles.includes("admin");
  const verified = member.status === "Vérifié";
  const name = fullName(member) || "Membre";


  return (
    <article className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      {/* Avatar cliquable */}
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

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="mt-1 font-mono text-[0.72rem] tracking-wide text-muted-foreground">
          {member.serial ?? "LF-…"}
        </p>
        <span
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${
            verified ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
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
