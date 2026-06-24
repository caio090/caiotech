import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RecosProjectContent } from "./_client-content";
import type {
  DbRecProject,
  DbRecScript,
  DbRecStoryboardFrame,
  DbRecReference,
  DbRecShotListItem,
  DbProjectAttachment,
} from "@/lib/supabase/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RecosProjectPage({ params }: Props) {
  const { id } = await params;

  let project: DbRecProject | null = null;
  let script: DbRecScript | null = null;
  let frames: DbRecStoryboardFrame[] = [];
  let references: DbRecReference[] = [];
  let shotList: DbRecShotListItem[] = [];
  let attachments: DbProjectAttachment[] = [];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();

      const [projRes, scriptRes, framesRes, refsRes, shotsRes, attachRes] = await Promise.all([
        supabase
          .from("rec_projects")
          .select("*, clients(company_name)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("rec_scripts")
          .select("*")
          .eq("project_id", id)
          .maybeSingle(),
        supabase
          .from("rec_storyboard_frames")
          .select("*")
          .eq("project_id", id)
          .order("scene_number")
          .order("frame_number"),
        supabase
          .from("rec_references")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("rec_shot_list")
          .select("*")
          .eq("project_id", id)
          .order("scene_number")
          .order("shot_number"),
        supabase
          .from("operational_attachments")
          .select("*")
          .eq("rec_project_id", id)
          .order("created_at", { ascending: false }),
      ]);

      project     = (projRes.data as DbRecProject) ?? null;
      script      = (scriptRes.data as DbRecScript) ?? null;
      frames      = (framesRes.data as DbRecStoryboardFrame[]) ?? [];
      references  = (refsRes.data as DbRecReference[]) ?? [];
      shotList    = (shotsRes.data as DbRecShotListItem[]) ?? [];
      attachments = (attachRes.data as DbProjectAttachment[]) ?? [];
    } catch {}
  }

  if (!project) notFound();

  return (
    <RecosProjectContent
      project={project}
      script={script}
      frames={frames}
      references={references}
      shotList={shotList}
      attachments={attachments}
    />
  );
}
