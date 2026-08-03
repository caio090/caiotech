import type { Page } from "@playwright/test";
import { MUTATING_METHODS, isMutableNamespace } from "../../../src/lib/workspaces/mutation-guard-runtime";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 26) — os testes "normais" (fora do próprio
 * login/logout e da entrada/saída do Workspace Preview) rodam contra o
 * projeto Supabase oficial com uma conta Super Admin real. Este guard
 * reaproveita a MESMA lógica pura já usada pelo proxy real
 * (src/lib/workspaces/mutation-guard-runtime.ts) — nunca uma segunda
 * lista que pode divergir — para falhar o teste se ele disparar uma
 * mutação real num namespace de API mutável.
 *
 * GET nunca é bloqueado. A autenticação do Supabase (outro host) nunca
 * bate em `isMutableNamespace()` (que só reconhece `/api/admin/`,
 * `/api/client/`, etc.), então login/logout passam sem exceção especial.
 */
const ALLOWED_MUTATION_PATHS = new Set([
  "/api/admin/workspaces/preview",
  "/api/admin/workspaces/preview/exit",
]);

export function installMutationGuard(page: Page) {
  const violations: string[] = [];

  page.on("request", (request) => {
    const method = request.method();
    if (!MUTATING_METHODS.has(method)) return;

    let pathname: string;
    try { pathname = new URL(request.url()).pathname; } catch { return; }

    if (!isMutableNamespace(pathname)) return;
    if (ALLOWED_MUTATION_PATHS.has(pathname)) return;

    violations.push(`${method} ${pathname}`);
  });

  return {
    violations,
    assertNoDangerousMutation() {
      if (violations.length > 0) {
        throw new Error(`Mutação real detectada num teste somente-leitura: ${violations.join(", ")}`);
      }
    },
  };
}
