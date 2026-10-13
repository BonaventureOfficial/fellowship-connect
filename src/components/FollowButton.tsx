import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsFollowing, useToggleFollow } from "@/lib/follows";
import type { Member } from "@/lib/members";
import { toast } from "sonner";

export function FollowButton({
  targetMember,
  className = "",
}: {
  targetMember: Member;
  className?: string;
}) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const targetUserId = targetMember.user_id;

  const { data: myMember } = useQuery({
    queryKey: ["my-member-status", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("status")
        .eq("user_id", currentUserId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: isFollowing = false, isLoading: loadingStatus } = useIsFollowing(
    currentUserId,
    targetUserId
  );

  const toggleMutation = useToggleFollow();

  if (!currentUserId || currentUserId === targetUserId) {
    return null;
  }

  const isCurrentVerified = myMember?.status === "Vérifié";
  const isTargetVerified = targetMember.status === "Vérifié";

  const handleAction = async () => {
    if (!currentUserId) {
      toast.error("Connectez-vous pour suivre des membres.");
      return;
    }

    if (!isCurrentVerified) {
      toast.error("Votre compte doit être Vérifié pour pouvoir suivre des membres.");
      return;
    }

    if (!isTargetVerified) {
      toast.error("Ce compte n'est pas encore Vérifié et ne peut pas recevoir d'abonnés.");
      return;
    }

    try {
      await toggleMutation.mutateAsync({
        currentUserId,
        targetUserId,
        isCurrentlyFollowing: isFollowing,
      });

      toast.success(
        isFollowing
          ? `Vous ne suivez plus ${targetMember.first_name || "ce membre"}.`
          : `Vous suivez maintenant ${targetMember.first_name || "ce membre"} !`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action impossible.";
      toast.error(msg);
    }
  };

  const isPending = toggleMutation.isPending || loadingStatus;

  return (
    <Button
      type="button"
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation();
        void handleAction();
      }}
      className={`h-7 px-3 text-xs font-semibold rounded-full transition-all ${
        isFollowing
          ? "border-primary/30 text-muted-foreground hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
          : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
      } ${className}`}
    >
      {isPending ? "…" : isFollowing ? "Abonné" : "Suivre"}
    </Button>
  );
}
