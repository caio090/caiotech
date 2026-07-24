"use client";

import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

/**
 * Fase 6 — "Painel ADM" is the real exit from any active preview: it calls
 * DELETE /api/admin/workspaces/preview (clears the signed cookie
 * server-side) before navigating, rather than just linking to
 * /admin/dashboard and leaving a stale cookie active. Never touches the
 * Supabase auth session — the user was never signed out or re-signed-in.
 */
export function WorkspaceExitButton() {
  const router = useRouter();

  async function handleClick() {
    try {
      await fetch("/api/admin/workspaces/preview", { method: "DELETE" });
    } finally {
      router.push("/admin/dashboard");
    }
  }

  return (
    <button
      onClick={handleClick}
      title="Painel ADM — sair de qualquer visualização"
      className="p-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-gray-500"
    >
      <LayoutGrid className="w-4 h-4" />
      <span className="hidden md:inline text-xs font-bold">Painel ADM</span>
    </button>
  );
}
