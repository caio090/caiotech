# Acesso seguro aos dados do CRM — Sprint Navegação e Experiência 3.0.1.2

## O bug relatado

`/admin/leads` exibia literalmente:

> SUPABASE_SERVICE_ROLE_KEY não configurada — leads indisponíveis.

## Onde vinha

`/api/admin/waitlist/route.ts` já retornava um código limpo
(`{ ok: false, code: "service_role_missing" }`, status 503) — a API nunca
vazava o nome da variável. O vazamento acontecia no **componente cliente**
(`src/app/admin/leads/page.tsx`), que mapeava esse `code` explicitamente
para o texto técnico.

## Correção

`src/lib/crm/data-state.ts`:

- `resolveCrmDataState()` — nunca repassa o `code` bruto; resolve para um
  dos 7 estados de produto (`loading`, `available_empty`,
  `available_with_data`, `unavailable`, `unauthorized`,
  `preview_read_only`, `demo`).
- `crmStateCopy()` — título/descrição genéricos por estado, nunca
  service role/env/credencial/Supabase. Texto usado (Fase 28):
  "Dados do CRM indisponíveis neste ambiente." / "Não foi possível
  carregar os leads agora. Tente novamente ou verifique a conexão
  configurada para este workspace."
- `containsForbiddenTechnicalDetail()` — usado em teste para garantir que
  nenhuma cópia futura reintroduza o vazamento.

## Zero real vs. indisponível (Fase 29)

Antes: uma falha de carregamento deixava `entries = []`, e os cards de
KPI mostravam "0" exatamente como se fossem zero real — só um aviso
pequeno acima. Agora: os KPIs mostram "—" (nunca "0") quando o estado não
é `available_*`, e um banner claro (`data-testid="crm-unavailable-banner"`)
explica a situação sem jargão técnico.

## Regras nunca violadas nesta sprint

Service role nunca chega ao navegador (a leitura em `/admin/leads` sempre
passa por `fetch("/api/admin/waitlist")`, nunca cria um client Supabase
com service role no componente cliente); nenhuma `NEXT_PUBLIC_*` de
service role criada; RLS não alterada; nenhuma chave configurada nesta
sprint.
