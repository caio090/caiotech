/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/jarvis/__tests__/global-aggregate.test.ts
 * Sprint Command Center + Jarvis Context V1 (Problema 6) — Jarvis Global
 * agrega SÓ as empresas que listAuthorizedCompanies() realmente autorizou.
 * getBusinessOfficeFeed(clientId: null) devolve dado de TODAS as empresas do
 * banco (fonte não filtrada por design) -- estes testes provam que uma
 * empresa fora da lista autorizada nunca contamina o resumo de uma empresa
 * autorizada, mesmo quando a mesma busca traz as duas juntas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildJarvisGlobalSummary } from "../global-aggregate";
import { getFortalezaToday } from "@/lib/global-calendar";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeDb(byTable: Record<string, unknown[]>, errorTables: Set<string> = new Set()): SupabaseClient {
  return {
    from: (table: string) => {
      const rows = byTable[table] ?? [];
      const isError = errorTables.has(table);
      const chain: Record<string, unknown> = {};
      const methods = ["select", "eq", "in", "order", "is", "or"];
      for (const m of methods) chain[m] = () => chain;
      chain.maybeSingle = async () => (isError ? { data: null, error: { message: "fake error" } } : { data: rows[0] ?? null, error: null });
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(resolve(isError ? { data: null, error: { message: "fake error" } } : { data: rows, error: null }));
      return chain;
    },
  } as unknown as SupabaseClient;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

const todayKey = getFortalezaToday().dateKey;
const yesterday = shiftDateKey(todayKey, -1);

async function main() {
  console.log("[test] 1 — sem nenhuma empresa autorizada: resumo vazio, nunca 'zero' fabricado por consulta que nem deveria rodar");
  {
    const db = fakeDb({ profiles: [{ client_id: null }], client_user_access: [], agency_workspaces: [], clients: [] });
    const summary = await buildJarvisGlobalSummary(db, "u-none", "admin");
    assert(summary.authorizedCompanyCount === 0, "nenhuma empresa autorizada");
    assert(summary.companies.length === 0, "nenhuma empresa no detalhe");
    assert(summary.omittedCompanyCount === 0, "nada omitido (nada para omitir)");
    assert(summary.calendarAvailable === true, "sem empresa autorizada, não há por que reportar fonte indisponível");
  }

  console.log("[test] 2 — isolamento: itens de uma empresa NÃO autorizada nunca contaminam a empresa autorizada, mesmo vindos da MESMA busca global");
  {
    const db = fakeDb({
      profiles: [{ client_id: null }],
      client_user_access: [{ client_id: "companyA", user_id: "u1", status: "active" }],
      agency_workspaces: [],
      clients: [{ id: "companyA", company_name: "Empresa A" }],
      content_items: [],
      operational_tasks: [
        { id: "task-a1", client_id: "companyA", content_item_id: null, approval_id: null, title: "Tarefa atrasada A", description: null, due_date: yesterday, start_date: null, status: "pendente", department: null, task_type: null, priority: null, assigned_to: null, assigned_role: null },
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `task-x${i}`, client_id: "companyX", content_item_id: null, approval_id: null, title: `Tarefa X ${i}`, description: null, due_date: yesterday, start_date: null, status: "pendente", department: null, task_type: null, priority: null, assigned_to: null, assigned_role: null,
        })),
      ],
      approvals: [
        { id: "appr-a1", client_id: "companyA", content_id: null, status: "pendente", approval_sent_at: null, approval_due_at: `${yesterday}T12:00:00-03:00`, created_at: `${yesterday}T12:00:00-03:00` },
      ],
      rec_projects: [
        { id: "proj-a1", client_id: "companyA", title: "Projeto ativo 1", objective: null, status: "producao", team: [], recording_date: null, updated_at: null },
        { id: "proj-a2", client_id: "companyA", title: "Projeto ativo 2", objective: null, status: "producao", team: [], recording_date: null, updated_at: null },
        { id: "proj-a3", client_id: "companyA", title: "Projeto encerrado", objective: null, status: "concluido", team: [], recording_date: null, updated_at: null },
      ],
    });

    const summary = await buildJarvisGlobalSummary(db, "u1", "admin");

    assert(summary.authorizedCompanyCount === 1, "só companyA está autorizada para este usuário (client_user_access)");
    assert(summary.companies.length === 1, "só uma empresa no detalhe");
    const companyA = summary.companies[0];
    assert(companyA?.companyId === "companyA", "a única empresa detalhada é a autorizada, nunca companyX");
    assert(companyA?.overdueCount === 2, `overdueCount de A é 2 (1 tarefa + 1 aprovação), nunca inflado pelas 5 tarefas de companyX (recebido: ${companyA?.overdueCount})`);
    assert(companyA?.approvalsPendingCount === 1, "aprovações pendentes contam só a de companyA");
    assert(companyA?.activeProjectsCount === 2, "2 projetos ativos (o 'concluido' não conta -- TERMINAL_PROJECT_STATUSES)");
    assert(!summary.companies.some((c) => c.companyId === "companyX"), "companyX nunca aparece no resumo -- não estava autorizada para este usuário");
  }

  console.log("[test] 3 — 'fonte indisponível não é zero': quando as 3 fontes falham, calendarAvailable=false (nunca reporta contagem zero como se fosse real)");
  {
    const db = fakeDb(
      {
        profiles: [{ client_id: null }],
        client_user_access: [{ client_id: "companyA", user_id: "u1", status: "active" }],
        agency_workspaces: [],
        clients: [{ id: "companyA", company_name: "Empresa A" }],
        rec_projects: [],
      },
      new Set(["content_items", "operational_tasks", "approvals"]),
    );
    const summary = await buildJarvisGlobalSummary(db, "u1", "admin");
    assert(summary.calendarAvailable === false, "todas as 3 fontes falharam -- calendarAvailable é false, nunca contagem zero silenciosa");
    assert(summary.companies[0]?.todayCount === 0 && summary.companies[0]?.overdueCount === 0, "contagens caem para zero só porque não há itens (não é confundido com sucesso) -- o sinal real de falha é calendarAvailable=false, verificado acima");
  }

  console.log("[test] 4 — super_admin vê e agrega todas as empresas visíveis (mesmo contrato de listAuthorizedCompanies)");
  {
    const db = fakeDb({
      clients: [{ id: "companyA", company_name: "Empresa A" }, { id: "companyB", company_name: "Empresa B" }],
      content_items: [],
      operational_tasks: [
        { id: "task-b1", client_id: "companyB", content_item_id: null, approval_id: null, title: "Tarefa hoje B", description: null, due_date: todayKey, start_date: null, status: "pendente", department: null, task_type: null, priority: null, assigned_to: null, assigned_role: null },
      ],
      approvals: [],
      rec_projects: [],
    });
    const summary = await buildJarvisGlobalSummary(db, "u-super", "super_admin");
    assert(summary.authorizedCompanyCount === 2, "super_admin autorizado para as 2 empresas visíveis");
    assert(summary.companies.some((c) => c.companyId === "companyB"), "companyB aparece no detalhe (super_admin vê tudo que é visível)");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
