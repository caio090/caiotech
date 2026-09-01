/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/studio/skills/execute/__tests__/execute-route.behavioral.test.ts
 * Sprint REC OS Studio Foundation V0.2 (Fase 20, itens 5/6/7) — chama o
 * handler POST REAL de src/app/api/studio/skills/execute/route.ts,
 * mockando só resolveCompanyContext() (único resolver de autorização,
 * nunca um segundo permission engine) e executeStudioSkill() (o
 * executor real, testado à parte em studio-neural-runtime.structural.test.ts).
 * Prova que a rota nunca chama o executor quando a Company não está
 * autorizada.
 */
import { test, mock, type TestContext } from "node:test";
import assert from "node:assert/strict";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mock.module as any)("@/lib/workspaces/assert-not-preview", {
  exports: { withMutationProtection: (handler: (...args: unknown[]) => unknown) => handler },
});

function req(body: unknown) {
  return new Request("http://x/api/studio/skills/execute", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

interface CompanyContextResolutionMock {
  valid: boolean;
  reason?: string;
  context: { companyId: string; companyName: string | null; workspaceId: string | null } | null;
}

async function loadRouteWith(t: TestContext, opts: {
  resolution: CompanyContextResolutionMock;
  executeResult?: unknown;
}) {
  let executeCalls = 0;
  let lastExecuteRequest: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/company-context/resolve", {
    exports: { resolveCompanyContext: async () => opts.resolution },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/rec-os/studio/execute", {
    exports: {
      executeStudioSkill: async (request: unknown) => {
        executeCalls++;
        lastExecuteRequest = request;
        return opts.executeResult ?? {
          skillId: "vidigal_png", skillVersion: "2.0.0", runtime: "openai_responses_api", status: "completed",
          output: { briefReading: "x", creativeDirection: "x", conceptualBasis: "x", visualStructure: "x", visualGuidelines: "x", generationPrompt: "x", variations: [], adaptations: [] },
          warnings: [], generatedAt: new Date().toISOString(),
        };
      },
    },
  });
  const mod = await import(`../route.ts?t=${Date.now()}-${Math.random()}`);
  return { POST: mod.POST, getExecuteCalls: () => executeCalls, getLastExecuteRequest: () => lastExecuteRequest };
}

test("[5] Company não autorizada (role_not_supported) -- 403, executeStudioSkill NUNCA chamado", async (t) => {
  const { POST, getExecuteCalls } = await loadRouteWith(t, {
    resolution: { valid: false, reason: "role_not_supported", context: null },
  });
  const res = await POST(req({ skillId: "vidigal_png", input: { freeformBrief: "teste" } }));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "STUDIO_COMPANY_CONTEXT_UNAUTHORIZED");
  assert.equal(getExecuteCalls(), 0, "negação de autorização é FINAL -- executeStudioSkill nunca é chamado");
});

test("[5] sem contexto de Company (não autenticado) -- 401, executeStudioSkill NUNCA chamado", async (t) => {
  const { POST, getExecuteCalls } = await loadRouteWith(t, {
    resolution: { valid: false, reason: "not_authenticated", context: null },
  });
  const res = await POST(req({ skillId: "vidigal_png", input: { freeformBrief: "teste" } }));
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.code, "STUDIO_COMPANY_CONTEXT_REQUIRED");
  assert.equal(getExecuteCalls(), 0);
});

test("[6] Company autorizada -- 200, executeStudioSkill chamado com o companyId JÁ RESOLVIDO", async (t) => {
  const { POST, getExecuteCalls, getLastExecuteRequest } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-a", companyName: "Empresa A", workspaceId: "ws-1" } },
  });
  const res = await POST(req({ skillId: "vidigal_png", input: { freeformBrief: "teste", companyId: "company-b-nunca-confiavel" } }));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(getExecuteCalls(), 1);
  const executedRequest = getLastExecuteRequest() as { context: { company: { id: string } } };
  assert.equal(executedRequest.context.company.id, "company-a", "o executor recebe o companyId JÁ AUTORIZADO pelo resolver, nunca o valor bruto enviado pelo cliente");
});

test("[7] super_admin (contexto global resolvido) segue o mesmo contrato canônico -- nenhum caminho paralelo", async (t) => {
  const { POST, getExecuteCalls } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "any-company-super-admin-can-see", companyName: "Qualquer Empresa", workspaceId: "ws-super" } },
  });
  const res = await POST(req({ skillId: "vidigal_png", input: { freeformBrief: "teste" } }));
  assert.equal(res.status, 200);
  assert.equal(getExecuteCalls(), 1, "super_admin passa pelo MESMO resolveCompanyContext() -- nenhuma checagem de role duplicada nesta rota");
});

test("skillId ausente -- 400, executeStudioSkill nunca chamado (nem resolveCompanyContext precisa rodar)", async (t) => {
  const { POST, getExecuteCalls } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-a", companyName: "Empresa A", workspaceId: "ws-1" } },
  });
  const res = await POST(req({ input: { freeformBrief: "teste" } }));
  assert.equal(res.status, 400);
  assert.equal(getExecuteCalls(), 0);
});

test("briefing livre acima do limite -- 400, executeStudioSkill nunca chamado", async (t) => {
  const { POST, getExecuteCalls } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-a", companyName: "Empresa A", workspaceId: "ws-1" } },
  });
  const res = await POST(req({ skillId: "vidigal_png", input: { freeformBrief: "x".repeat(5000) } }));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.code, "STUDIO_SKILL_INVALID_INPUT");
  assert.equal(getExecuteCalls(), 0);
});
