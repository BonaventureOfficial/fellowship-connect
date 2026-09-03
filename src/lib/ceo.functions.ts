import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertCeo(context: {
  supabase: { from: (t: string) => any };
  userId: string;
}) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "ceo")
    .maybeSingle();
  if (error) throw new Error("Vérification du rôle impossible.");
  if (!data) throw new Error("Accès réservé au CEO.");
}

/** Liste des admins (CEO uniquement). */
export const listAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCeo(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role")
      .in("role", ["ceo", "admin"]);
    if (error) throw new Error(error.message);
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const emails = new Map(list?.users.map((u) => [u.id, u.email ?? ""]) ?? []);
    return (roles ?? []).map((r) => ({
      user_id: r.user_id,
      role: r.role as string,
      email: emails.get(r.user_id) ?? "",
    }));
  });

/** Ajoute un admin par email (CEO uniquement). */
export const addAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Email invalide.");
    return { email };
  })
  .handler(async ({ data, context }) => {
    await assertCeo(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (lErr) throw new Error(lErr.message);
    const target = list?.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email,
    );
    if (!target) {
      throw new Error(
        "Aucun compte avec cet email. La personne doit d'abord créer son compte.",
      );
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: target.id, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true, email: data.email };
  });

/** Retire un admin (CEO uniquement). */
export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: input.userId }))
  .handler(async ({ data, context }) => {
    await assertCeo(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
