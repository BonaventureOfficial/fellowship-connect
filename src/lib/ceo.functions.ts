import { supabase } from "@/integrations/supabase/client";

// Fonctions de base de données sécurisées (vérifient le rôle CEO côté base) :
// aucune clé secrète requise, fonctionne sur n'importe quel hébergeur.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: any; error: { message: string } | null }>;

export async function listAdmins(): Promise<
  { user_id: string; role: string; email: string }[]
> {
  const { data, error } = await rpc("lf_list_admins");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addAdmin({ data }: { data: { email: string } }) {
  const email = (data?.email ?? "").trim().toLowerCase();
  const { error } = await rpc("lf_add_admin", { _email: email });
  if (error) throw new Error(error.message);
  return { ok: true, email };
}

export async function removeAdmin({ data }: { data: { userId: string } }) {
  const { error } = await rpc("lf_remove_admin", { _user_id: data.userId });
  if (error) throw new Error(error.message);
  return { ok: true };
}
