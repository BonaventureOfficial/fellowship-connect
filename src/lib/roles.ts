import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "ceo" | "admin" | "member";

export interface UserRoleRow {
  user_id: string;
  role: AppRole;
}

async function fetchRoles(): Promise<UserRoleRow[]> {
  const { data, error } = await supabase.from("user_roles").select("user_id,role");
  if (error) throw error;
  return (data ?? []) as UserRoleRow[];
}

/** Map user_id -> rôles, lisible publiquement (utilisé pour les badges). */
export function useRolesMap() {
  const query = useQuery({ queryKey: ["user-roles"], queryFn: fetchRoles });
  const map = new Map<string, AppRole[]>();
  for (const r of query.data ?? []) {
    map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]);
  }
  return { rolesMap: map, isLoading: query.isLoading };
}

export function useMyRoles(userId?: string | null) {
  const { rolesMap, isLoading } = useRolesMap();
  const roles = userId ? (rolesMap.get(userId) ?? []) : [];
  return {
    roles,
    isCeo: roles.includes("ceo"),
    isAdmin: roles.includes("admin") || roles.includes("ceo"),
    isLoading,
  };
}
