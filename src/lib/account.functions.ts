import { supabase } from "@/integrations/supabase/client";

/** Suppression définitive du compte du membre connecté (fonction sécurisée en base). */
export async function deleteMyAccount({ data }: { data: { confirm: boolean } }) {
  if (!data?.confirm) throw new Error("Confirmation requise.");
  const { error } = await (supabase.rpc as any)("lf_delete_my_account");
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  return { ok: true };
}
