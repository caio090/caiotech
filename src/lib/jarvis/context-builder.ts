/**
 * Sprint MVP Experience Completion V0.1 (Parte D5/D7, Fase 21-23) — Jarvis
 * Context Builder. Nunca despeja o banco inteiro no prompt (Fase 21): monta
 * um texto compacto e limitado, só com o que o usuário já vê nas próprias
 * telas (Company Central/Escritório/Projetos) -- nenhum dado mais sensível
 * do que isso.
 *
 * Visibility (Fase 22, D7): `ProjectProjection`/`WorkItemProjection` ainda
 * não carregam `NeuralVisibilityPolicy` por item (essa camada foi definida
 * na Foundation para ConfirmedFact/DerivedKnowledge/ResponseBlock/etc, não
 * para as projections desta sprint). A garantia real aqui é estrutural: um
 * allowlist explícito de campos (nome da empresa, surface, rota, contagens
 * agregadas, título/status de projeto e de work item) -- nunca um campo
 * livre de origem desconhecida entra no texto. `resolveVisibilityPolicy()`
 * ainda é chamado para fixar o baseline restritivo (Fase 15 da Foundation)
 * e documentar a intenção, mesmo sem uma policy dinâmica por item nesta
 * versão.
 */
import { resolveVisibilityPolicy } from "@/lib/neural-core/visibility";
import type { ProjectProjection } from "@/lib/project-projection/types";
import type { WorkItemProjection } from "@/lib/work-item-projection/types";
import { MAX_CONTEXT_CHARS } from "./cost-controls";

export interface JarvisOfficeSummary {
  todayCount: number;
  overdueCount: number;
  approvalsCount: number;
  calendarAvailable: boolean;
}

export interface JarvisContextInput {
  companyName: string | null;
  surface: string;
  route: string;
  office: JarvisOfficeSummary;
  activeProjects: ProjectProjection[];
  attentionItems: WorkItemProjection[];
}

/** Allowlist estrutural (Fase 22): nenhum outro campo de ProjectProjection/WorkItemProjection entra no texto. */
function safeProjectLine(project: ProjectProjection): string {
  return `- ${project.title} (status: ${project.status})`;
}

function safeWorkItemLine(item: WorkItemProjection): string {
  const due = item.dueAt ? ` — prazo ${new Date(item.dueAt).toLocaleDateString("pt-BR")}` : "";
  return `- [${item.type}] ${item.title} (status: ${item.status})${due}`;
}

export function buildJarvisContextText(input: JarvisContextInput): string {
  resolveVisibilityPolicy(undefined); // fixa o baseline restritivo -- ver nota do módulo.

  const lines: string[] = [];
  lines.push(`Empresa atual: ${input.companyName ?? "não identificada"}`);
  lines.push(`Tipo de conta: ${input.surface}`);
  lines.push(`Página atual: ${input.route}`);
  lines.push("");
  lines.push("Resumo do Escritório:");
  lines.push(`- Itens hoje: ${input.office.todayCount}`);
  lines.push(`- Atrasados: ${input.office.overdueCount}`);
  lines.push(`- Aprovações pendentes: ${input.office.approvalsCount}`);
  if (!input.office.calendarAvailable) lines.push("- Agenda: não foi possível consultar agora (indisponível, não é zero).");
  lines.push("");

  if (input.activeProjects.length > 0) {
    lines.push("Projetos ativos:");
    for (const p of input.activeProjects.slice(0, 8)) lines.push(safeProjectLine(p));
    lines.push("");
  } else {
    lines.push("Nenhum projeto ativo registrado no momento.");
    lines.push("");
  }

  if (input.attentionItems.length > 0) {
    lines.push("Itens que precisam de atenção (ordenados por urgência):");
    for (const item of input.attentionItems.slice(0, 12)) lines.push(safeWorkItemLine(item));
  } else {
    lines.push("Nenhuma pendência real encontrada no momento.");
  }

  const text = lines.join("\n");
  return text.length > MAX_CONTEXT_CHARS ? `${text.slice(0, MAX_CONTEXT_CHARS)}\n[...contexto truncado]` : text;
}
