import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAdminContentOSClients } from "@/lib/admin-contentos-clients";
import { AdminSelecionarClienteContent } from "./_client-content";

export default async function AdminContentosSelecionarClientePage() {
  const clients = isSupabaseConfigured ? await getAdminContentOSClients() : [];

  return (
    <AdminSelecionarClienteContent
      clients={clients}
      isSupabaseActive={isSupabaseConfigured}
    />
  );
}
