import { MeuNegocioContent } from "./_client-content";

/**
 * Sprint Motor LOKAT 1.0 — "Meu Negócio" preview.
 *
 * This first vertical slice runs entirely in demo mode: no Supabase reads or
 * writes, no persistence. Every value is an editable example that lives only
 * in the browser's memory for the duration of the session. See _client-content.tsx.
 */
export default function AdminMeuNegocioPage() {
  return <MeuNegocioContent />;
}
