import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  redirect(`/admin/contentos/criar?tab=visual${client ? `&client=${client}` : ""}`);
}
