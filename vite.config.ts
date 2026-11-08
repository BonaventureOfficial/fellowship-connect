import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const NEW_SUPABASE_ENV: Record<string, string> = {
  VITE_SUPABASE_URL: "https://zwngnydeplxqbvndfzke.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ih7WfMeHSYlXudBGuDMOfQ_zmvYuMrL",
  VITE_SUPABASE_PROJECT_ID: "zwngnydeplxqbvndfzke",
};

const define: Record<string, string> = {};
for (const [key, value] of Object.entries(NEW_SUPABASE_ENV)) {
  define[`import.meta.env.${key}`] = JSON.stringify(value);
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: { define },
});
