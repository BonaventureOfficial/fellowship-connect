import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FollowCounts {
  followersCount: number;
  followingCount: number;
}

/**
 * Récupère le compteur de followers et followings d un utilisateur
 */
export function useFollowCounts(userId?: string | null) {
  return useQuery({
    queryKey: ["follow-counts", userId],
    enabled: !!userId,
    queryFn: async (): Promise<FollowCounts> => {
      if (!userId) return { followersCount: 0, followingCount: 0 };

      const { count: followersCount, error: errFollowers } = await (supabase as any)
        .from("member_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_user_id", userId);

      if (errFollowers) throw errFollowers;

      const { count: followingCount, error: errFollowing } = await (supabase as any)
        .from("member_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_user_id", userId);

      if (errFollowing) throw errFollowing;

      return {
        followersCount: followersCount ?? 0,
        followingCount: followingCount ?? 0,
      };
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Vérifie si l utilisateur connecté suit un profil cible
 */
export function useIsFollowing(currentUserId?: string | null, targetUserId?: string | null) {
  return useQuery({
    queryKey: ["is-following", currentUserId, targetUserId],
    enabled: !!currentUserId && !!targetUserId && currentUserId !== targetUserId,
    queryFn: async (): Promise<boolean> => {
      if (!currentUserId || !targetUserId || currentUserId === targetUserId) return false;

      const { data, error } = await (supabase as any)
        .from("member_follows")
        .select("id")
        .eq("follower_user_id", currentUserId)
        .eq("following_user_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Mutation pour Follow / Unfollow avec rafraîchissement des requêtes
 */
export function useToggleFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      currentUserId,
      targetUserId,
      isCurrentlyFollowing,
    }: {
      currentUserId: string;
      targetUserId: string;
      isCurrentlyFollowing: boolean;
    }) => {
      if (isCurrentlyFollowing) {
        const { error } = await (supabase as any)
          .from("member_follows")
          .delete()
          .eq("follower_user_id", currentUserId)
          .eq("following_user_id", targetUserId);

        if (error) throw error;
        return { action: "unfollowed" as const };
      } else {
        const { error } = await (supabase as any)
          .from("member_follows")
          .insert({
            follower_user_id: currentUserId,
            following_user_id: targetUserId,
          });

        if (error) throw error;
        return { action: "followed" as const };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["is-following", variables.currentUserId, variables.targetUserId],
      });
      queryClient.invalidateQueries({
        queryKey: ["follow-counts", variables.targetUserId],
      });
      queryClient.invalidateQueries({
        queryKey: ["follow-counts", variables.currentUserId],
      });
    },
  });
}
