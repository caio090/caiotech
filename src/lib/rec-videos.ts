"use client";
import { createClient } from "@/lib/supabase/client";

export interface RecVideo {
  id: string;
  title: string;
  description: string | null;
  client_name: string | null;
  category: string | null;
  video_url: string;
  storage_path: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  is_featured: boolean;
  is_feedback: boolean;
  show_in_cards: boolean;
  sort_order: number;
  status: string;
  created_at: string;
}

export type RecVideoInsert = Omit<RecVideo, "id" | "created_at"> & { created_by?: string };

const BUCKET = "rec-videos";
const ALLOWED = ["video/mp4", "video/webm", "video/quicktime", "video/mov"];

// ── Queries ─────────────────────────────────────────────────────────────────

export async function getPublicRecVideos(): Promise<RecVideo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("rec_videos")
    .select("*")
    .eq("is_public", true)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as RecVideo[]) ?? [];
}

export async function getAdminRecVideos(): Promise<RecVideo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("rec_videos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as RecVideo[]) ?? [];
}

export async function createRecVideo(
  data: Omit<RecVideo, "id" | "created_at">
): Promise<{ data: RecVideo | null; error: string | null }> {
  const supabase = createClient();
  const { data: res, error } = await supabase
    .from("rec_videos")
    .insert(data)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: res as RecVideo, error: null };
}

export async function updateRecVideo(
  id: string,
  fields: Partial<Omit<RecVideo, "id" | "created_at">>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("rec_videos").update(fields).eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function archiveRecVideo(id: string): Promise<{ error: string | null }> {
  return updateRecVideo(id, { status: "archived" });
}

// ── Storage upload ───────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function uploadRecVideoFile(file: File): Promise<{
  publicUrl: string | null;
  storagePath: string | null;
  error: string | null;
}> {
  if (!ALLOWED.includes(file.type)) {
    return { publicUrl: null, storagePath: null, error: "Tipo de arquivo não permitido. Use MP4, WebM ou MOV." };
  }

  const ext       = file.name.split(".").pop() ?? "mp4";
  const slug      = slugify(file.name.replace(/\.[^.]+$/, ""));
  const path      = `rec/${Date.now()}-${slug}.${ext}`;
  const supabase  = createClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    return { publicUrl: null, storagePath: null, error: uploadError.message };
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl, storagePath: path, error: null };
}
