"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RecDropIcon } from "@/components/icons/RecDropIcon";
import { ACTIVE_CLIENT_KEY, ACTIVE_CLIENT_NAME_KEY } from "@/lib/active-client";
import type { AdminContentosClient } from "@/lib/admin-contentos-clients";

interface Props {
  clients: AdminContentosClient[];
}

export function ContentOSAdminCard({ clients }: Props) {
  const router = useRouter();

  function handleSelect(client: AdminContentosClient) {
    localStorage.setItem(ACTIVE_CLIENT_KEY, client.id);
    localStorage.setItem(ACTIVE_CLIENT_NAME_KEY, client.company_name ?? "");
    router.push(`/admin/contentos/home?client=${client.id}`);
  }

  return (
    <div className="rounded-2xl p-5 mb-8" style={{ background: "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)" }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <RecDropIcon size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">REC OS</p>
            <p className="text-xs text-red-200">Criação, aprovação e publicação de conteúdo</p>
          </div>
        </div>
        <Link
          href="/admin/contentos/selecionar-cliente"
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors flex-shrink-0"
        >
          Abrir REC OS
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="mt-4 pt-4 border-t border-white/20">
        {clients.length === 0 ? (
          <p className="text-xs text-purple-200">Nenhum cliente real cadastrado ainda.</p>
        ) : (
          <>
            <p className="text-xs text-purple-200 mb-2.5">Acesso rápido por cliente:</p>
            <div className="flex flex-wrap gap-2">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors bg-white/20 text-white hover:bg-white/30"
                >
                  {c.company_name || "Sem nome"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-red-300 mt-2">
              Clique em um cliente para abrir a REC OS direto.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
