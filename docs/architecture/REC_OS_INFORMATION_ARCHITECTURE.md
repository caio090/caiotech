# REC OS — Arquitetura de Informação V2.2

## Navegação principal (5 itens)

| Item | Rota | Descrição |
|------|------|-----------|
| Visão Geral | `/admin/contentos/home` | Dashboard com KPIs, pautas recentes, sugestões IA |
| Campanhas | `/admin/contentos/campanhas` | Gestão de campanhas + Base Estratégica + Tráfego pago |
| ✦ Criar | `/admin/contentos/criar` | Fluxo de criação de conteúdo + EditorOS + PNG Vidigal |
| Calendário | `/admin/contentos/calendario` | Calendário unificado com filtros de status |
| Resultados | `/admin/contentos/resultados` | Métricas de desempenho + Oportunidades + Relatórios |

## Sub-tabs por seção

### Campanhas (`?tab=`)
- `campanhas` — Lista de campanhas (em desenvolvimento)
- `estrategia` — Base Estratégica: posicionamento, persona, tom de voz
- `trafego` — Distribuição de tráfego pago (ex-Distribuição)

### ✦ Criar (`?tab=`)
- `criar` — Fluxo original de criação de conteúdo
- `editor` — EditorOS (super_admin apenas)
- `visual` — PNG Vidigal (geração por IA, não configurado)

### Calendário (`?tab=`)
- `todos` — Todos os itens com `scheduled_date`
- `planejado` — status: ideia, briefing
- `em_producao` — status: briefing, em_producao, edicao, revisao_interna, producao
- `em_aprovacao` — status: enviado_aprovacao
- `aprovado` — status: aprovado, pronto_para_agendar
- `agendado` — status: agendado
- `publicado` — status: publicado

### Resultados (`?tab=`)
- `desempenho` — KPIs, distribuição por status, breakdown tipo/canal, Meta Insights
- `oportunidades` — Radar de oportunidades (stub)
- `relatorios` — Relatórios exportáveis (stub)

## Redirects legados (rotas preservadas)

| Rota antiga | Redirect para |
|-------------|---------------|
| `/admin/contentos/base-estrategica` | `/admin/contentos/campanhas?tab=estrategia` |
| `/admin/contentos/distribuicao` | `/admin/contentos/campanhas?tab=trafego` |
| `/admin/contentos/insights` | `/admin/contentos/resultados?tab=desempenho` |
| `/admin/contentos/radar` | `/admin/contentos/resultados?tab=oportunidades` |
| `/admin/contentos/relatorios` | `/admin/contentos/resultados?tab=relatorios` |
| `/admin/contentos/visual` | `/admin/contentos/criar?tab=visual` |
| `/admin/contentos/agendamento` | `/admin/contentos/calendario?tab=agendado` |

Todos os redirects preservam `?client=` (e aceitam `?client_id=` como fallback legado).

## Rotas que permanecem funcionais (fora do nav principal)

- `/admin/contentos/producao` — Itens em produção, link para criar briefing
- `/admin/contentos/aprovacoes` — Itens aguardando aprovação
- `/admin/contentos/editor-os` — Canvas editor (acessado via Criar → EditorOS)
