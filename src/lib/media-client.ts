import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

// Media contracts remain separate while Cloud is restoring and generated
// schema types cannot be refreshed. Reuse the existing authenticated client.
type VideoRow = {
  id: string;
  user_id: string;
  author_name: string;
  author_serial: string | null;
  author_avatar: string | null;
  type: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  shares_count: number;
  created_at: string;
};

type CommentRow = {
  id: string;
  video_id: string;
  user_id: string;
  author_name: string;
  author_serial: string | null;
  author_avatar: string | null;
  content: string;
  parent_id: string | null;
  created_at: string;
};

type LikeRow = {
  id: string;
  video_id: string;
  user_id: string;
  created_at: string;
};

type MediaTable<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

type MediaDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      videos: MediaTable<VideoRow, "user_id" | "author_name" | "type" | "title" | "video_url">;
      video_comments: MediaTable<CommentRow, "video_id" | "user_id" | "author_name" | "content">;
      video_likes: MediaTable<LikeRow, "video_id" | "user_id">;
    };
    Functions: Database["public"]["Functions"] & {
      record_video_view: { Args: { p_video_id: string }; Returns: boolean };
    };
  };
};

export const mediaClient = supabase as SupabaseClient<MediaDatabase>;