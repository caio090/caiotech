"use client";

import { useState } from "react";
import { LayoutGrid, AlertTriangle } from "lucide-react";

const GENERIC_EXIT_ERROR = "Não foi possível sair da visualização. Tente novamente.";

// Sanitized local timing only (a single duration number, never a
// cookie/token/payload) — module-scope, not nested inside the component,
// so react-hooks/purity doesn't (rightly, for actual render code) flag the
// impure performance.now() call; these only ever run from an async click
// handler, never during render.
function startPreviewTimer(): number {
  return performance.now();
}
function logPreviewDuration(label: string, startedAt: number) {
  console.info(`[workspace-preview] ${label}: ${Math.round(performance.now() - startedAt)}ms`);
}

/**
 * Fase 6 — "Painel ADM" is the real exit from any active preview: it calls
 * DELETE /api/admin/workspaces/preview (clears the signed cookie
 * server-side) before navigating, rather than just linking to
 * /admin/dashboard and leaving a stale cookie active. Never touches the
 * Supabase auth session — the user was never signed out or re-signed-in.
 *
 * Hotfix 1.0.9 — Production QA found two real problems with the previous
 * version: (1) the banner/old panel could stay visible until a manual
 * refresh (same App Router Router Cache gap as workspace-view-switcher.tsx
 * — router.push()+router.refresh() are two separate round-trips, not one
 * atomic navigation), and (2) the navigation ran unconditionally inside a
 * `finally` block, so it fired even when the DELETE request itself failed
 * — the URL would change to /admin/dashboard while the preview cookie was
 * still active server-side, an inconsistent state. Both are fixed by
 * treating exit the same way as entering a preview: exactly one DELETE,
 * validated, then exactly one real browser navigation
 * (window.location.replace) — never inside finally, never on an
 * unconfirmed response.
 */
export function WorkspaceExitButton() {
  const [exiting, setExiting] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);

  async function handleClick() {
    if (exiting) return; // one exit attempt in flight at a time
    setExiting(true);
    setExitError(null);
    const requestStartedAt = startPreviewTimer();
    try {
      const res = await fetch("/api/admin/workspaces/preview", { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      logPreviewDuration("saída", requestStartedAt);

      if (res.ok && body?.ok === true) {
        // Success: `exiting` stays true — the button stays disabled and
        // the preview/banner stay exactly as they are on screen until the
        // browser actually replaces this document with /admin/dashboard.
        // window.location.replace (not assign) so the ended preview
        // document never becomes a browser-back target.
        window.location.replace("/admin/dashboard");
        return;
      }

      // DELETE did not confirm success: do NOT navigate. The preview
      // stays active and visible, exactly as before the click — never
      // pretend the exit happened when it didn't.
      setExitError(GENERIC_EXIT_ERROR);
      setExiting(false);
    } catch {
      setExitError(GENERIC_EXIT_ERROR);
      setExiting(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={exiting}
        title={exiting ? "Saindo da visualização…" : "Painel ADM — sair de qualquer visualização"}
        aria-label={exiting ? "Saindo da visualização…" : "Painel ADM — sair de qualquer visualização"}
        className="p-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-gray-500 disabled:opacity-50"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden md:inline text-xs font-bold">{exiting ? "Saindo…" : "Painel ADM"}</span>
      </button>
      {exitError && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-red-100 rounded-xl shadow-xl z-50 px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 leading-relaxed">{exitError} A visualização continua ativa — clique em &quot;Painel ADM&quot; novamente para tentar de novo.</p>
        </div>
      )}
    </div>
  );
}
