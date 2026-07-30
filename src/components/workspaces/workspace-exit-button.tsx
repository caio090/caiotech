"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";

const EXIT_ACTION = "/api/admin/workspaces/preview/exit";

/**
 * Hotfix 1.0.10 — "Painel ADM" is a real HTML form submission now, not a
 * fetch()+client-navigation pair. POST /api/admin/workspaces/preview/exit
 * deletes the preview cookie and issues an HTTP 303 to /admin/dashboard on
 * the SAME response (see src/lib/workspaces/atomic-exit.ts) — there is no
 * separate window.location call here to race against the cookie write,
 * because there is no second request at all: the browser's own form
 * navigation IS the single request/response that does both.
 *
 * No client-visible error state exists anymore: every outcome (authorized
 * exit, expired session, demoted role) is itself a safe 303 the browser
 * follows on its own — there is no bare failure response for this
 * component to interpret or display.
 */
export function WorkspaceExitButton() {
  const [exiting, setExiting] = useState(false);

  return (
    <form method="post" action={EXIT_ACTION} onSubmit={() => setExiting(true)}>
      <button
        type="submit"
        disabled={exiting}
        title={exiting ? "Saindo da visualização…" : "Painel ADM — sair de qualquer visualização"}
        aria-label={exiting ? "Saindo da visualização…" : "Painel ADM — sair de qualquer visualização"}
        className="p-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-gray-500 disabled:opacity-50"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden md:inline text-xs font-bold">{exiting ? "Saindo…" : "Painel ADM"}</span>
      </button>
    </form>
  );
}
