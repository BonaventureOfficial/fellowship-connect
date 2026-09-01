import type { Member } from "@/lib/members";

export function MemberCard({ member }: { member: Member }) {
  const verified = member.status === "Vérifié";
  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <article className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40">
      {/* Avatar avec initiales */}
      <div className="lf-ring-gradient shrink-0 rounded-full p-[2px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-sm font-bold text-foreground">
          {initials}
        </div>
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {member.name}
          </p>
        </div>
        <p className="truncate text-xs text-muted-foreground">{member.role}</p>
        <p className="mt-1 font-mono text-[0.7rem] tracking-wide text-muted-foreground">
          {member.serial}
        </p>
      </div>

      {/* Statut */}
      <span
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${
          verified
            ? "bg-accent/20 text-accent"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            verified ? "bg-accent" : "bg-muted-foreground"
          }`}
        />
        {member.status}
      </span>
    </article>
  );
}
