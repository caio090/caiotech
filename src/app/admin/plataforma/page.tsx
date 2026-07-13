// Rota legada mantida para compatibilidade.
// A Central de Contas oficial é /admin/super/accounts.
// Esta página foi aposentada como página funcional em 2026-07-13 por duplicar
// Dashboard, Clientes e Central de Contas sem adicionar valor próprio.
import { redirect } from "next/navigation";

export default function PlataformaLegacyPage() {
  redirect("/admin/super/accounts");
}
