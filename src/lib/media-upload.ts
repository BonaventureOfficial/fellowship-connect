import { supabase } from "@/integrations/supabase/client";

export const MEDIA_ORIGIN = "https://media.livingfellowship2026.com";

export function mediaUrlFromResponse(value: unknown): string {
  if (!value || typeof value !== "object") throw new Error("Réponse média invalide.");
  const response = value as Record<string, unknown>;
  const nested = response.data;
  const data = nested && typeof nested === "object" ? nested as Record<string, unknown> : response;
  if (typeof data.key === "string" && data.key.trim()) {
    return `${MEDIA_ORIGIN}/media/${data.key.split("/").map(encodeURIComponent).join("/")}`;
  }
  const url = data.url ?? data.media_url;
  if (typeof url === "string") {
    const parsed = new URL(url, MEDIA_ORIGIN);
    if (parsed.origin === MEDIA_ORIGIN && parsed.pathname.startsWith("/media/")) return parsed.href;
  }
  throw new Error("Le service média n’a pas renvoyé de clé ou d’adresse valide.");
}

export function validateMediaFile(file: Pick<File, "type" | "size">, kind: "image" | "video") {
  if (!file.type.startsWith(`${kind}/`)) throw new Error("Type de fichier invalide.");
  const max = (kind === "image" ? 10 : 100) * 1024 * 1024;
  if (file.size > max) throw new Error(`Le fichier ne doit pas dépasser ${kind === "image" ? 10 : 100} Mo.`);
  if (file.size === 0) throw new Error("Le fichier est vide.");
}

export async function uploadMedia(
  file: File,
  kind: "image" | "video",
  onProgress?: (percent: number, loaded: number, total: number) => void,
): Promise<string> {
  validateMediaFile(file, kind);
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.access_token) throw new Error("Connectez-vous pour envoyer un fichier.");
  const form = new FormData();
  form.append("file", file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${MEDIA_ORIGIN}/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100), event.loaded, event.total);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Échec de l’envoi (${xhr.status}) : ${xhr.responseText}`));
        return;
      }
      try {
        resolve(mediaUrlFromResponse(JSON.parse(xhr.responseText)));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l’envoi du fichier."));
    xhr.ontimeout = () => reject(new Error("L’envoi a dépassé le délai autorisé."));
    xhr.onabort = () => reject(new Error("Envoi annulé."));
    xhr.send(form);
  });
}