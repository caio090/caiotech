"use client";
import { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/access-control";

const AVATAR_COLORS = [
  "bg-indigo-600", "bg-purple-600", "bg-pink-600", "bg-emerald-600",
  "bg-amber-600", "bg-red-600", "bg-teal-600", "bg-slate-600",
];

function pickColor(seed: string) {
  const n = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";
}

export interface CurrentUserCardProps {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
  className?: string;
}

export function CurrentUserCard({ name, email, role, department, avatarUrl, className = "" }: CurrentUserCardProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }));
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const displayName = name ?? email?.split("@")[0] ?? "Usuário";
  const roleLabel   = role ? (ROLE_LABELS[role] ?? role) : "Função não definida";
  const badgeColor  = role ? (ROLE_COLORS[role]  ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-600";
  const ini         = initials(displayName);
  const avatarBg    = pickColor(displayName);

  return (
    <div className={`bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 ${className}`}>
      <div className="flex-shrink-0">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-xl object-cover" />
        ) : (
          <div className={`w-10 h-10 rounded-xl ${avatarBg} flex items-center justify-center text-white font-bold text-sm`}>
            {ini}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-900 truncate">{displayName}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{roleLabel}</span>
        </div>
        {department && (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{department}</p>
        )}
      </div>

      {time && (
        <div className="hidden sm:flex flex-col items-end flex-shrink-0 gap-0.5">
          <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
            <Clock className="w-3 h-3" />
            {time}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar className="w-3 h-3" />
            <span className="capitalize">{date}</span>
          </div>
        </div>
      )}
    </div>
  );
}
