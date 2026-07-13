# Status do Projeto — LOKAT OS V1

> Referência: `src/config/project-status.ts` e `src/lib/project-status.ts`
> Data: Julho 2026 · V1_PROGRESS = 81 · V2_PROGRESS = 12

---

## Resumo executivo

A LOKAT OS está em fase beta fechada (pré-acesso). O core da plataforma está implementado e parcialmente validado. Os principais bloqueadores para V1 completo são: gateway Asaas não homologado, WhatsApp Business API pendente, e SQL 77 (billing) não executado em produção.

---

## Legenda de status

| Status | Significado |
|--------|-------------|
| `validated` | Testado e aprovado em produção |
| `implemented` | Código pronto, sem QA formal |
| `deployed` | Em produção, QA pendente |
| `qa_pending` | Aguardando teste formal |
| `in_progress` | Em desenvolvimento ativo |
| `blocked` | Depende de ação externa ou decisão |
| `planned` | Planejado, não iniciado |
| `out_of_scope` | Fora do escopo V1 |

---

## V1 — Áreas e status

### Infraestrutura

| Área | Status | Observações |
|------|--------|-------------|
| Autenticação | `validated` | Login, convites, sessão, RLS funcionando em produção |
| Schema do banco | `deployed` | 77+ SQLs evolutivos. SQL 77 (billing) não executado |
| Storage | `deployed` | Buckets ativos. Políticas em validação |

### Clientes e Onboarding

| Área | Status | Observações |
|------|--------|-------------|
| Gestão de clientes | `implemented` | CRUD, filtros, soft delete. QA formal pendente |
| Onboarding | `qa_pending` | Checklist e fluxo de ativação prontos. Testes end-to-end pendentes |

### Conteúdo (ContenOS)

| Área | Status | Observações |
|------|--------|-------------|
| ContenOS | `implemented` | Calendário editorial, aprovação por link |
| Aprovações públicas | `implemented` | Aprovação sem login funcionando |

### Audiovisual (REC OS)

| Área | Status | Observações |
|------|--------|-------------|
| REC OS | `implemented` | Briefing, roteiro, decupagem, produção |
| Storyboard | `qa_pending` | Visualização de cenas pronta. QA pendente |

### Integrações

| Área | Status | Observações |
|------|--------|-------------|
| Meta / Instagram | `deployed` | OAuth e insights básicos ativos |
| Cardápio Digital (OlaClick) | `deployed` | Faturamento e pedidos OlaClick integrados |
| WhatsApp | `blocked` | Canal em preparação. Bloqueador: homologação Meta Business API |

### Relatórios e Diagnósticos

| Área | Status | Observações |
|------|--------|-------------|
| Relatórios | `implemented` | Faturamento, Meta insights, diagnóstico |
| Diagnósticos | `deployed` | Diagnóstico de marketing ativo e em uso |

### Comercial

| Área | Status | Observações |
|------|--------|-------------|
| CRM Comercial | `qa_pending` | Leads, funil, oportunidades prontos |
| Equipe | `implemented` | Papéis, convites, acessos |

### Billing e Assinatura

| Área | Status | Observações |
|------|--------|-------------|
| Arquitetura de billing | `implemented` | Planos, cupons, assinaturas, providers modelados |
| Gateway Asaas | `blocked` | Bloqueadores: credenciais sandbox pendentes + SQL 77 não executado |
| Checkout público | `planned` | Depende de Asaas homologado |

### Público (Sprint Pública)

| Área | Status | Observações |
|------|--------|-------------|
| Landing page | `deployed` | Multinicho, hero, FAQ, ciclo visual, perfis, módulos |
| Blog público | `deployed` | Listagem, artigo, categorias, admin. Tabelas SQL 78 pendentes (graceful degradation ativo) |
| Página de contato | `deployed` | Formulário, API, rate limit, honeypot |
| SEO técnico | `deployed` | robots.ts, sitemap.ts, canonical, JSON-LD, metadataBase |

---

## Bloqueadores críticos V1

1. **SQL 77 (billing)** — tabelas de assinatura não executadas. Gateway Asaas e checkout dependem disso.
2. **Asaas sandbox** — credenciais e homologação pendentes com equipe Asaas.
3. **SQL 78 (blog)** — tabelas do blog não executadas. Blog funciona com graceful degradation (estado vazio).
4. **WhatsApp Business API** — homologação Meta pendente. Canal em preparação, não habilitado.

---

## Próximas ações prioritárias

- [ ] Executar SQL 77 em produção (billing) — pré-requisito para Asaas
- [ ] Executar SQL 78 em produção (blog) — habilitar conteúdo editorial
- [ ] Homologar Asaas sandbox com credenciais reais
- [ ] QA formal: onboarding, CRM, storyboard
- [ ] Iniciar checklist WhatsApp Business API

---

## V2 — Planejado (não iniciado)

| Área | Descrição |
|------|-----------|
| Google AdSense (blog) | Monetização do blog |
| Programa de afiliados | Parceiros e referrals |

---

## Notas

- `V1_PROGRESS = 81` e `V2_PROGRESS = 12` são constantes definidas em `src/lib/project-status.ts` e `src/config/project-status.ts`. Não alterar sem QA formal em produção.
- Este documento é atualizado manualmente após sprints ou eventos relevantes.
- A fonte autoritativa de status granular por área está em `src/config/project-status.ts`.
