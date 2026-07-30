import { MeuNegocioEntry } from "./_entry";

/**
 * Sprint Motor LOKAT 1.0 — "Meu Negócio" preview (original Motor LOKAT
 * segment demo, kept at ./_client-content.tsx, unused from this entry
 * point since the vertical slice sprint below).
 *
 * feat/meu-negocio-stock-restaurant-v1 — vertical slice Restaurante:
 * seleção de empresa primeiro, depois estoque/fichas técnicas/CMV/
 * relatórios para o arquétipo food_service. Continua 100% em memória —
 * nenhuma consulta ou mutação real ao Supabase.
 */
export default function AdminMeuNegocioPage() {
  return <MeuNegocioEntry />;
}
