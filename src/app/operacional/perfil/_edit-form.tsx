"use client";
import { useState } from "react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { Pencil, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  profileId: string;
  initialName: string;
  initialPhone: string;
}

export function PerfilEditForm({ profileId, initialName, initialPhone }: Props) {
  const [name,    setName]    = useState(initialName);
  const [phone,   setPhone]   = useState(initialPhone);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("profiles")
        .update({ name: name.trim(), phone: phone.trim() || null })
        .eq("id", profileId);
      if (err) {
        setError("Erro ao salvar. Tente novamente.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Erro inesperado.");
    }
    setSaving(false);
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Pencil className="w-3 h-3" /> Editar informações
      </p>
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-300 bg-white placeholder-gray-400"
            placeholder="Seu nome completo"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Telefone (opcional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-300 bg-white placeholder-gray-400"
            placeholder="+55 11 99999-9999"
          />
        </div>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={saving || !isSupabaseConfigured}
          className={cn(
            "flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors",
            saved
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-indigo-600 text-white hover:bg-indigo-700",
            (saving || !isSupabaseConfigured) && "opacity-60 cursor-not-allowed",
          )}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Pencil className="w-3.5 h-3.5" />
          )}
          {saved ? "Salvo!" : saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}
