import { redirect } from "next/navigation";

// REC OS is the new name for ContentOS — redirect for compatibility
export default function RecOsRedirect() {
  redirect("/admin/contentos/selecionar-cliente");
}
