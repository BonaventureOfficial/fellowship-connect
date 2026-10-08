import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { lfLogo } from "@/lib/assets";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyRoles } from "@/lib/roles";
import {
  FONT_OPTIONS,
  fontCss,
  markAnnouncementsSeen,
  sanitize,
  useAnnouncements,
  type Announcement,
} from "@/lib/announcements";
import { AnnouncementReactions } from "@/components/AnnouncementReactions";

export const Route = createFileRoute("/annonces")({
  head: () => ({
    meta: [
      { title: "Living Fellowship — Annonces" },
      {
        name: "description",
        content:
          "Annonces et communications officielles de Living Fellowship.",
      },
      { property: "og:title", content: "Living Fellowship — Annonces" },
      {
        property: "og:description",
        content:
          "Annonces et communications officielles de Living Fellowship.",
      },
    ],
  }),
  component: AnnoncesComponent,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Editor({
  onPublished,
  initial,
  onCancel,
}: {
  onPublished: () => void;
  initial?: Announcement;
  onCancel?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [initFont, initFlag] = (initial?.font_family ?? "sans").split("|");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [bg, setBg] = useState(initial?.bg_color ?? "#12121c");
  const [fg, setFg] = useState(initial?.text_color ?? "#f5f5f7");
  const [font, setFont] = useState<string>(initFont || "sans");
  const [underlineTitle, setUnderlineTitle] = useState(initial ? initFlag === "u" : true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (initial && ref.current) ref.current.innerHTML = sanitize(initial.content_html);
  }, [initial]);

  const cmd = (name: string) => {
    ref.current?.focus();
    document.execCommand(name, false);
  };

  const publish = async () => {
    const html = sanitize(ref.current?.innerHTML ?? "");
    if (!title.trim() || !ref.current?.innerText.trim()) {
      toast.error("Ajoutez un titre et un contenu.");
      return;
    }
    if (!user) {
      toast.error("Connectez-vous pour publier.");
      return;
    }
    setSaving(true);
    const fields = {
      title: title.trim(),
      content_html: html,
      bg_color: bg,
      text_color: fg,
      font_family: underlineTitle ? `${font}|u` : font,
    };
    const { error } = initial
      ? await supabase.from("announcements").update(fields).eq("id", initial.id)
      : await supabase.from("announcements").insert({ ...fields, author_id: user.id });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!initial) {
      setTitle("");
      if (ref.current) ref.current.innerHTML = "";
    }
    toast.success(initial ? "Annonce modifiée." : "Annonce publiée.");
    onPublished();
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {initial ? "Modifier l'annonce" : "Éditeur d'annonce"}
      </h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Titre de l'annonce"
        className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => cmd("bold")}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold text-foreground hover:bg-secondary"
        >
          G
        </button>
        <button
          type="button"
          onClick={() => cmd("italic")}
          className="rounded-lg border border-border px-3 py-1.5 text-sm italic text-foreground hover:bg-secondary"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => cmd("underline")}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground underline hover:bg-secondary"
        >
          S
        </button>
        <button
          type="button"
          onClick={() => cmd("insertUnorderedList")}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
        >
          Liste
        </button>
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground">
          Fond
          <input
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground">
          Texte
          <input
            type="color"
            value={fg}
            onChange={(e) => setFg(e.target.value)}
            className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={underlineTitle}
            onChange={(e) => setUnderlineTitle(e.target.checked)}
          />
          Souligner le titre
        </label>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Rédigez votre annonce ici…"
        className="lf-editor mt-3 min-h-[9rem] w-full rounded-xl border border-border p-3 text-sm leading-relaxed outline-none focus:border-primary"
        style={{
          backgroundColor: bg,
          color: fg,
          fontFamily: fontCss(font),
        }}
      />

      <div className="mt-3 flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={publish}
          disabled={saving}
          className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : initial ? "Enregistrer les modifications" : "Publier l'annonce"}
        </button>
      </div>
    </section>
  );
}

function AnnouncementCard({
  a,
  isStaff,
  userId,
  onDelete,
  onEdit,
}: {
  a: Announcement;
  isStaff: boolean;
  userId?: string;
  onDelete: (id: string) => void;
  onEdit: (a: Announcement) => void;
}) {
  const [font, flag] = a.font_family.split("|");
  return (
    <li
      className="lf-card-enter overflow-hidden rounded-2xl border border-border"
      style={{
        backgroundColor: a.bg_color,
        color: a.text_color,
        fontFamily: fontCss(font ?? "sans"),
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2
            className={`text-base font-bold ${flag === "u" ? "underline underline-offset-4" : ""}`}
          >
            {a.title}
          </h2>
          {isStaff && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onEdit(a)}
                className="rounded-lg border border-current/30 px-2 py-1 text-[0.65rem] opacity-70 hover:opacity-100"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Supprimer cette annonce ?")) onDelete(a.id);
                }}
                className="rounded-lg border border-current/30 px-2 py-1 text-[0.65rem] opacity-70 hover:opacity-100"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
        <div
          className="lf-annonce-body mt-2 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitize(a.content_html) }}
        />
        <p className="mt-3 text-[0.7rem] opacity-70">
          Publiée le {formatDate(a.published_at)}
          {a.updated_at && new Date(a.updated_at).getTime() - new Date(a.published_at).getTime() > 60000
            ? ` · modifiée le ${formatDate(a.updated_at)}`
            : ""}
        </p>
        <AnnouncementReactions announcementId={a.id} userId={userId} isStaff={isStaff} />
      </div>
    </li>
  );
}

function AnnoncesComponent() {
  const { user } = useAuth();
  const { isAdmin } = useMyRoles(user?.id);
  const { data: annonces = [], isLoading } = useAnnouncements();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Announcement | null>(null);

  useEffect(() => {
    markAnnouncementsSeen();
  }, [annonces.length]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["announcements"] });

  const remove = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Annonce supprimée.");
    refresh();
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      <header className="flex items-center gap-3">
        <img
          src={lfLogo.url}
          alt="Living Fellowship"
          className="h-10 w-10 select-none"
        />
        <div>
          <h1 className="text-lg font-bold text-foreground">Annonces</h1>
          <p className="text-[0.7rem] text-muted-foreground">
            Communications officielles de Living Fellowship
          </p>
        </div>
      </header>

      {isAdmin &&
        (editing ? (
          <Editor
            key={editing.id}
            initial={editing}
            onCancel={() => setEditing(null)}
            onPublished={() => {
              setEditing(null);
              refresh();
            }}
          />
        ) : (
          <Editor key="new" onPublished={refresh} />
        ))}

      <section className="mt-6">
        {isLoading ? (
          <ul className="space-y-3">
            {[0, 1].map((i) => (
              <li
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </ul>
        ) : annonces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Aucune annonce publiée pour le moment
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les annonces officielles apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {annonces.map((a) => (
              <AnnouncementCard
                key={a.id}
                a={a}
                isStaff={isAdmin}
                userId={user?.id}
                onDelete={remove}
                onEdit={(x) => {
                  setEditing(x);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
