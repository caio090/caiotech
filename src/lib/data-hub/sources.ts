import type { DataSource } from "./types";

/** Fontes conhecidas hoje -- registrar aqui não implica conexão real, só que o Data Hub sabe que ela existe. */
export const DATA_SOURCES: DataSource[] = [
  { id: "meu_negocio_manual", label: "Meu Negócio (entrada manual)", type: "manual", ownerModuleId: "meu_negocio", description: "Valores digitados diretamente pelo usuário nas telas de Meu Negócio." },
  { id: "rec_os_internal", label: "REC OS (conteúdo)", type: "internal_module", ownerModuleId: "rec_os", description: "content_items, aprovações e distribuição do REC OS." },
  { id: "calendar_internal", label: "Calendário Global", type: "calendar", ownerModuleId: "calendario_global", description: "GlobalCalendarEvent agregando content_item/operational_task/approval." },
  { id: "spreadsheet_import", label: "Planilha importada", type: "xlsx", description: "Importação manual de planilha (fluxo de caixa, estoque etc.)." },
  { id: "bank_statement_import", label: "Extrato bancário", type: "bank_statement", description: "Extrato importado para conciliação financeira." },
  { id: "whatsapp_manual", label: "WhatsApp (registro manual)", type: "whatsapp", description: "Ainda sem integração real -- hoje só o que o usuário registra manualmente." },
];

export function findDataSourceById(id: string): DataSource | undefined {
  return DATA_SOURCES.find((source) => source.id === id);
}
