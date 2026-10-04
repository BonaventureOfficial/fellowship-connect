import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

/** Extract the storage path inside the "avatars" bucket from a stored URL or path. */
function avatarPath(stored: string): string | null {
  const m = stored.match(/\/avatars\/([^?]+)/);
  if (m) return decodeURIComponent(m[1] ?? "");
  if (!stored.startsWith("http")) return stored;
  return null;
}

/** Returns a freshly signed URL for an avatar, so old/expired links still display. */
export function useAvatarUrl(stored: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    stored ? (cache.get(stored) ?? null) : null,
  );
  useEffect(() => {
    if (!stored) return setUrl(null);
    const hit = cache.get(stored);
    if (hit) return setUrl(hit);
    const path = avatarPath(stored);
    if (!path) return setUrl(stored);
    let alive = true;
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24)
      .then(({ data }) => {
        const fresh = data?.signedUrl ?? stored;
        cache.set(stored, fresh);
        if (alive) setUrl(fresh);
      });
    return () => {
      alive = false;
    };
  }, [stored]);
  return url;
}
