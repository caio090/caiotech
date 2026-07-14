import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; client_id?: string }>;
}) {
  const params = await searchParams;
  const client = params.client ?? params.client_id ?? "";
  redirect(`/admin/contentos/calendario?tab=agendado${client ? `&client=${client}` : ""}`);
}
