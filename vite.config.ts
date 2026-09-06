// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Valeurs publiques du backend. Utilisées uniquement comme secours quand la
// plateforme d'hébergement (ex. Cloudflare) ne fournit pas les variables au build.
const FALLBACK_ENV: Record<string, string> = {
  VITE_SUPABASE_URL: "https://sadkljntcdfdwebbyijx.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_61lUt9Y1NGm-gWR7uDG9zQ_zNkpJd9d",
  VITE_SUPABASE_PROJECT_ID: "sadkljntcdfdwebbyijx",
};

const define: Record<string, string> = {};
for (const [key, value] of Object.entries(FALLBACK_ENV)) {
  if (!process.env[key]) {
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  }
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { define },
});
