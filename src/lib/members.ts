export type MemberStatus = "Vérifié" | "Non Vérifié";

export interface Member {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  serial: string | null;
  status: string;
  created_at: string;
}

export function fullName(m: Pick<Member, "first_name" | "last_name">) {
  return `${m.first_name} ${m.last_name}`.trim();
}

export function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]!)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "LF"
  );
}
