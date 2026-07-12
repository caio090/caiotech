"use client";

import { ReactNode } from "react";
import {
  CheckCircle2, Clock, XCircle, AlertCircle, Loader2,
  Zap, Wrench, ChevronRight, Plus, Users,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ProviderStatus =
  | "connected"
  | "partial"
  | "disconnected"
  | "unavailable"
  | "loading"
  | "coming_soon"
  | "in_preparation";

const accentStyles = {
  indigo:  { iconBg: "bg-indigo-50",  iconColor: "text-indigo-500",  chevron: "text-indigo-400" },
  orange:  { iconBg: "bg-orange-50",  iconColor: "text-orange-500",  chevron: "text-orange-400" },
  blue:    { iconBg: "bg-blue-50",    iconColor: "text-blue-500",    chevron: "text-blue-400"   },
  violet:  { iconBg: "bg-violet-50",  iconColor: "text-violet-500",  chevron: "text-violet-400" },
  emerald: { iconBg: "bg-emerald-50", iconColor: "text-emerald-500", chevron: "text-emerald-400"},
  amber:   { iconBg: "bg-amber-50",   iconColor: "text-amber-500",   chevron: "text-amber-400"  },
  pink:    { iconBg: "bg-pink-50",    iconColor: "text-pink-500",    chevron: "text-pink-400"   },
  green:   { iconBg: "bg-green-50",   iconColor: "text-green-500",   chevron: "text-green-400"  },
  gray:    { iconBg: "bg-gray-50",    iconColor: "text-gray-400",    chevron: "text-gray-300"   },
} as const;

export type AccentColor = keyof typeof accentStyles;

export type IntegrationProviderCardProps = {
  providerId: string;
  title: string;
  description: string;
  icon: ReactNode;
  platformStatus: ProviderStatus;
  statusLabel?: string;
  statusOverride?: ReactNode;
  connectedClientsCount?: number;
  pendingClientsCount?: number;
  features?: string[];
  onConnectClient?: () => void;
  connectLabel?: string;
  onManage?: () => void;
  manageLabel?: string;
  children?: ReactNode;
  accentColor?: AccentColor;
  comingSoon?: boolean;
  inPreparation?: boolean;
  dimmed?: boolean;
  /** Extra action buttons rendered after the primary buttons */
  extraActions?: ReactNode;
};

// ── Status badge ───────────────────────────────────────────────────────────────

function PlatformStatusBadge({
  status,
  label,
}: {
  status: ProviderStatus;
  label?: string;
}) {
  switch (status) {
    case "connected":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> {label ?? "Conectado"}
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" /> {label ?? "Parcial"}
        </span>
      );
    case "disconnected":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" /> {label ?? "Não conectado"}
        </span>
      );
    case "loading":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" /> {label ?? "Verificando…"}
        </span>
      );
    case "coming_soon":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
          <Zap className="w-3 h-3" /> Em breve
        </span>
      );
    case "in_preparation":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
          <Wrench className="w-3 h-3" /> Em preparação
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
          <XCircle className="w-3 h-3" /> {label ?? "Indisponível"}
        </span>
      );
  }
}

// ── Card ───────────────────────────────────────────────────────────────────────

export function IntegrationProviderCard({
  providerId,
  title,
  description,
  icon,
  platformStatus,
  statusLabel,
  statusOverride,
  connectedClientsCount,
  pendingClientsCount,
  features,
  onConnectClient,
  connectLabel = "Conectar cliente",
  onManage,
  manageLabel = "Gerenciar",
  children,
  accentColor = "indigo",
  comingSoon,
  inPreparation,
  dimmed,
  extraActions,
}: IntegrationProviderCardProps) {
  const styles = accentStyles[accentColor];
  const isUnavailable = comingSoon ?? inPreparation ?? dimmed ?? false;

  return (
    <div
      data-provider-id={providerId}
      className={`bg-white rounded-2xl border border-gray-100 p-5 ${isUnavailable ? "opacity-70" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.iconBg}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {statusOverride ?? (
            <PlatformStatusBadge status={platformStatus} label={statusLabel} />
          )}
        </div>
      </div>

      {/* Features list */}
      {features && features.length > 0 && (
        <div className="space-y-1 mb-4 text-xs text-gray-500">
          {features.map((f) => (
            <p
              key={f}
              className={`flex items-center gap-1.5 ${isUnavailable ? "text-gray-300" : ""}`}
            >
              <ChevronRight
                className={`w-3 h-3 ${isUnavailable ? "text-gray-200" : styles.chevron}`}
              />
              {f}
            </p>
          ))}
        </div>
      )}

      {/* Client counts */}
      {(connectedClientsCount !== undefined || pendingClientsCount !== undefined) && (
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          {connectedClientsCount !== undefined && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <strong className="text-gray-800">{connectedClientsCount}</strong>{" "}
              conectado{connectedClientsCount !== 1 ? "s" : ""}
            </span>
          )}
          {pendingClientsCount !== undefined && pendingClientsCount > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <strong className="text-gray-600">{pendingClientsCount}</strong>{" "}
              pendente{pendingClientsCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Provider-specific content */}
      {children}

      {/* Action buttons */}
      {!isUnavailable && (onConnectClient != null || onManage != null || extraActions != null) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
          {onConnectClient && (
            <button
              onClick={onConnectClient}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {connectLabel}
            </button>
          )}
          {onManage && (
            <button
              onClick={onManage}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> {manageLabel}
            </button>
          )}
          {extraActions}
        </div>
      )}
    </div>
  );
}
