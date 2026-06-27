# ContentOS — Auditoria de Limpeza (V1)

## Objetivo

Mapear arquivos suspeitos de duplicidade, SQLs criados, componentes órfãos e
informações fora do lugar, SEM deletar nada automaticamente.

---

## Estrutura atual da ContentOS

### Rotas admin (`/admin/contentos/*`)
Cada rota é um Server Component que valida o cliente e delega para o
componente compartilhado em `/app/contentos/*` ou renderiza direto.

| Rota | Arquivo admin | Arquivo base | Status |
|---|---|---|---|
| home | `admin/contentos/home/page.tsx` | `contentos/home/_client-content.tsx` | Ativo |
| criar | `admin/contentos/criar/page.tsx` | `contentos/criar/page.tsx` | Ativo |
| base-estrategica | `admin/contentos/base-estrategica/page.tsx` | — | Ativo (próprio) |
| campanhas | `admin/contentos/campanhas/page.tsx` | — | Ativo (próprio) |
| calendario | `admin/contentos/calendario/page.tsx` | `contentos/calendario/_client-content.tsx` | Ativo |
| producao | `admin/contentos/producao/page.tsx` | — | Ativo (próprio) |
| distribuicao | `admin/contentos/distribuicao/page.tsx` | — | Ativo (próprio) |
| insights | `admin/contentos/insights/page.tsx` | — | Ativo (próprio) |
| radar | `admin/contentos/radar/page.tsx` | — | Ativo (próprio, V1 conceitual) |
| visual | `admin/contentos/visual/page.tsx` | — | Stub (em breve) |
| aprovacoes | `admin/contentos/aprovacoes/page.tsx` | `contentos/aprovacoes/_client-content.tsx` | Ativo |
| relatorios | `admin/contentos/relatorios/page.tsx` | — | Ativo (próprio) |

### Rotas `/contentos/*` (cliente + staff sem contexto admin)
Contém: analytics, aprovacoes, base-estrategica, biblioteca, calendario,
campanhas, canva, configuracoes, criar, distribuicao, home, insights,
inspiracao, jornada, producao, publicacoes, relatorios, selecionar-cliente.

---

## Duplicidades suspeitas

| Item | Local A | Local B | Risco de remover |
|---|---|---|---|
| Página aprovacoes | `admin/contentos/aprovacoes` | `contentos/aprovacoes` | Alto — contextos diferentes (admin vs cliente) |
| Página calendario | `admin/contentos/calendario` | `contentos/calendario` | Alto — mesma lógica, contextos diferentes |
| Página campanhas | `admin/contentos/campanhas` | `contentos/campanhas` | Médio — admin tem dados reais, cliente tem visão simplificada |
| Página base-estrategica | `admin/contentos/base-estrategica` | `contentos/base-estrategica` | Médio — conteúdos divergem (admin edita, cliente lê) |
| Página insights | `admin/contentos/insights` | `contentos/insights` | Médio |
| Página relatorios | `admin/contentos/relatorios` | `contentos/relatorios` | Médio |
| SelectClientPage | `admin/contentos/selecionar-cliente` | `contentos/selecionar-cliente` | Alto — contextos completamente diferentes |
| `analytics/page.tsx` | `contentos/analytics` | — | Baixo — parece não usada, verificar subnav |
| `inspiracao/page.tsx` | `contentos/inspiracao` | — | Baixo — verificar se está na subnav |
| `jornada/page.tsx` | `contentos/jornada` | — | Baixo — verificar se está na subnav |
| `biblioteca/page.tsx` | `contentos/biblioteca` | — | Baixo — verificar se está na subnav |
| `publicacoes/page.tsx` | `contentos/publicacoes` | — | Baixo — verificar se está na subnav |

---

## SQLs criados — ContentOS e módulos relacionados

| Arquivo SQL | Tabela/Objeto | Status |
|---|---|---|
| `docs/supabase/37-client-meta-assets.sql` | `client_meta_assets` | Ativo (Meta/Instagram) |
| `docs/supabase/39-olaclick-connections.sql` | `olaclick_connections`, `v_olaclick_connections_safe` | Pendente (executar manualmente) |
| SQL de onboarding (provável 01-10) | `onboarding_profiles` | Ativo |
| SQL de clientes | `clients` | Ativo |
| SQL de conteúdos | `content_items` | Ativo |
| SQL de aprovações | `approvals` | Ativo |
| SQL de tarefas operacionais | `operational_tasks` | Ativo |
| SQL 27 (trigger aprovação → produção) | trigger em `approvals` | Ativo |
| `client_context` | contexto estratégico por cliente | Ativo (referenciado em home) |

**SQLs que parecem conceituais / não rodados:**
- `39-olaclick-connections.sql` — precisa rodar no Supabase
- Qualquer SQL > 39 que não exista em `docs/supabase/`

---

## Componentes com risco de abandono

| Componente | Localização | Suspeita |
|---|---|---|
| `_brief-gate.tsx` | `admin/contentos/home/` | OK — ativo, corrigido nesta rodada |
| `contentos/canva/page.tsx` | `contentos/canva` | Página de integração Canva — verificar se está na subnav do cliente |
| `contentos/configuracoes/page.tsx` | `contentos/configuracoes` | Verificar se está acessível |
| `admin/status/page.tsx` | `admin/status` | Criado nesta sprint — verificar link no dashboard |

---

## Informações fora do lugar identificadas (e corrigidas nesta rodada)

| Problema | Onde estava | Correção aplicada |
|---|---|---|
| "Preencher diagnóstico" apontava para `/admin/clientes` | `_brief-gate.tsx` | Corrigido → `/admin/contentos/base-estrategica?client=` |
| Relatórios ContentOS tinham "Dados físicos do cliente" (financeiro) | `relatorios/page.tsx` | Removido, substituído por cards de conteúdo |
| "Criação rápida" redirecionava para wizard de 9 etapas | `criar/page.tsx` | Novo modo `QuickCreateForm` (campos mínimos) |
| Distribuição sem badge Meta contextual | `distribuicao/page.tsx` | Badge Meta adicionado |
| Campanhas sem botões de ação | `campanhas/page.tsx` | Botões desabilitados "em breve" adicionados |
| Base Estratégica sem link para Radar | `base-estrategica/page.tsx` | Bloco "Radar e oportunidades" + CTA adicionados |

---

## Sugestões de limpeza futura (NÃO DELETAR AGORA)

1. **`contentos/analytics/page.tsx`** — Verificar se está linkada. Se não, candidata a remoção.
2. **`contentos/inspiracao/page.tsx`** — Idem.
3. **`contentos/jornada/page.tsx`** — Idem.
4. **`contentos/biblioteca/page.tsx`** e `_client-content.tsx` — Verificar uso.
5. **`contentos/publicacoes/`** — Verificar se duplica `calendario`.
6. Consolidar `admin/contentos/base-estrategica` e `contentos/base-estrategica` em componente compartilhado quando a funcionalidade de edição for implementada.
7. Verificar se `contentos/selecionar-cliente` ainda faz sentido (clientes geralmente chegam com contexto já definido).

---

## Riscos de remover prematuramente

- Qualquer rota sem verificar se está no middleware de autenticação pode quebrar rotas públicas ou protected.
- SQLs com triggers dependentes (ex: SQL 27) não podem ser removidos sem antes remover os triggers.
- Componentes de cliente (`_client-content.tsx`) podem ser importados por múltiplas rotas admin.

---

*Gerado em: 2026-06-26 | Não deletar nada sem revisão manual.*
