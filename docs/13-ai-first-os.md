# 13 · AI First OS — Sugestões Inteligentes & Lokat Voice Tech

## Visão geral

A LOKAT OS opera com uma camada inicial de inteligência baseada em **regras determinísticas** (não IA generativa). O sistema analisa dados reais do Supabase em tempo real e gera sugestões acionáveis exibidas em cada módulo relevante.

Esta é a **fase 1** da jornada de IA: sem APIs externas, sem LLMs, sem agentes autônomos. Apenas lógica de negócio bem definida que age como um copiloto discreto.

---

## Componentes principais

### `SmartSuggestionsPanel` — `src/components/smart-suggestions-panel.tsx`

Componente client-side reutilizável. Recebe `AISuggestion[]` como props (calculadas no servidor).

- Collapsível via chevron
- Badge de tipo (`next_action`, `risk_alert`, `opportunity`, `reminder`, etc.)
- Badge de prioridade (`baixa`, `media`, `alta`, `urgente`)
- Ações: **Aceitar**, **Ignorar**, **Ver** (link)
- Persiste silenciosamente na tabela `ai_suggestions` via upsert (falha silenciosa se a tabela não existir)
- Modo `compact` para espaços reduzidos

Props:
```ts
interface Props {
  suggestions: AISuggestion[];
  title?: string;      // default: "Sugestões Inteligentes"
  compact?: boolean;   // default: false
  className?: string;
}
```

### `LokatVoicePanel` — `src/components/lokat-voice-panel.tsx`

Botão flutuante fixo no canto inferior direito (apenas em layouts admin/staff).

- Lê contadores reais do Supabase ao abrir: aprovações pendentes, tarefas atrasadas, conteúdos prontos para agendar, leads com follow-up vencido
- Gera resumo textual contextual baseado nos dados
- Links rápidos para os módulos relevantes
- Ativado/desativado via localStorage (`lokat_voice_enabled`)
- Visível via localStorage (`lokat_voice_floating_button`)
- **Não implementa voz real** — fase futura

Chaves localStorage:
| Chave | Padrão | Descrição |
|---|---|---|
| `lokat_voice_enabled` | `"true"` | Ativa/desativa o painel |
| `lokat_voice_floating_button` | `"true"` | Exibe o botão flutuante |

### `src/lib/ai-suggestions.ts`

Funções server-side que calculam sugestões por contexto:

| Função | Contexto | Dados consultados |
|---|---|---|
| `getContentOSSuggestions(supabase, clientId)` | Admin/Staff ContentOS | `approvals`, `content_items` |
| `getAdminSuggestions(supabase)` | Admin dashboard | `approvals`, `operational_tasks`, `leads` |
| `getOperationalSuggestions(supabase, userId, roles)` | Equipe operacional | `operational_tasks` |
| `getProductivitySuggestions(supabase, userId, roles)` | Produtividade | `operational_tasks` |
| `getClientSafeSuggestions(supabase, clientId)` | Portal do cliente | `approvals`, `content_items` (apenas dados seguros) |

---

## Regras de sugestão — fase 1

### ContentOS
| Gatilho | Tipo | Prioridade |
|---|---|---|
| Aprovação aguardando > 48h | `risk_alert` | `urgente` |
| Aprovação aguardando 24–48h | `risk_alert` | `alta` |
| Conteúdo `pronto_para_agendar` existe | `next_action` | `alta` |
| Sem conteúdo agendado nos próximos 7 dias | `reminder` | `media` |
| Conteúdo aprovado com potencial de tráfego | `opportunity` | `baixa` |

### Admin
| Gatilho | Tipo | Prioridade |
|---|---|---|
| Aprovações atrasadas de qualquer cliente | `risk_alert` | `urgente` |
| Tarefas operacionais com prazo vencido | `risk_alert` | `alta` |
| Leads com `next_action_at` vencido | `commercial` | `alta` |

### Operacional
| Gatilho | Tipo | Prioridade |
|---|---|---|
| Tarefa com `due_date` < hoje | `risk_alert` | `urgente` |
| Tarefa com `due_date` = hoje | `reminder` | `alta` |
| Tarefa em `briefing` há > 48h sem mover | `workflow` | `media` |

### Cliente (portal)
| Gatilho | Tipo | Prioridade |
|---|---|---|
| Aprovação aguardando ação do cliente | `next_action` | `alta` |
| Conteúdo agendado nos próximos 3 dias | `reminder` | `media` |

---

## Tabela de persistência — `ai_suggestions`

Ver SQL em `docs/supabase/19-ai-suggestions-and-lokat-voice-tech.sql`.

Campos principais:
- `module` — identifica de onde veio a sugestão (`contentos`, `operacional`, `admin`, `cliente`)
- `suggestion_type` — tipo semântico da sugestão
- `status` — `ativa`, `aceita`, `ignorada`, `expirada`
- `entity_type` / `entity_id` — vínculo opcional com registro específico
- `client_id` — segmentação por cliente quando aplicável

**RLS:** Admin lê tudo. Staff lê as próprias ou sem user_id. Cliente lê APENAS `module='cliente'`, excluindo tipos financeiros, comerciais e de workflow interno.

---

## Onde aparece — cobertura atual

| Página | Função | Modo |
|---|---|---|
| `/admin/dashboard` | `getAdminSuggestions` | normal |
| `/admin/contentos/home` | `getContentOSSuggestions` | normal |
| `/admin/contentos/base-estrategica` | `getContentOSSuggestions` | compact |
| `/admin/contentos/campanhas` | `getContentOSSuggestions` | compact |
| `/admin/contentos/producao` | `getContentOSSuggestions` | compact |
| `/admin/contentos/distribuicao` | `getContentOSSuggestions` | compact |
| `/admin/contentos/insights` | `getContentOSSuggestions` | compact |
| `/admin/contentos/relatorios` | `getContentOSSuggestions` | compact |
| `/admin/contentos/aprovacoes` | `getContentOSSuggestions` | compact |
| `/operacional/dashboard` | `getOperationalSuggestions` | normal |
| `/operacional/minhas-tarefas` | `getOperationalSuggestions` | compact |
| `/client/home` | `getClientSafeSuggestions` | compact |

**Lokat Voice Panel:** presente em todos os layouts admin/staff via `AdminLayoutShell`.

---

## Tipos de sugestão

```ts
type SuggestionType =
  | "next_action"    // próxima ação clara a tomar
  | "risk_alert"     // risco de perder prazo ou cliente
  | "opportunity"    // oportunidade identificada (tráfego, venda)
  | "reminder"       // lembrete de data/prazo
  | "optimization"   // melhoria de processo
  | "content_idea"   // ideia de pauta (fase futura)
  | "workflow"       // gargalo de fluxo
  | "financial"      // dado financeiro relevante
  | "commercial"     // lead/CRM
  | "production"     // produção de conteúdo
  | "report_insight" // dado de relatório
  | "productivity"   // produtividade individual
  | "voice_prompt";  // prompt de voz (fase futura)
```

---

## Preparação para fase futura — Agentes

A arquitetura atual suporta evolução para agentes reais sem reescrever a base:

| Agente planejado | Módulo | Dados necessários |
|---|---|---|
| CEO Agent | Admin / Financeiro / Relatórios | MRR, churn, pipeline, KPIs |
| CMO Agent | ContentOS / Distribuição | Desempenho de conteúdo, campanhas |
| COO Agent | Operacional | Tarefas, SLA, capacidade da equipe |
| CFO Agent | Financeiro | Fluxo de caixa, inadimplência, previsão |
| Comercial Agent | CRM / Leads | Funil, follow-ups, conversão |
| ContentOS Agent | ContentOS | Pauta, briefing, aprovação, publicação |
| Operacional Agent | Operacional | Distribuição de tarefas, prazos |

**Quando ativar:** apenas quando houver API key segura no servidor, revisão de custos, controle de rate limit e aprovação explícita de cada ação pelo usuário ou administrador.

---

## Princípios de design

1. **Discreto, não intrusivo** — sugestões aparecem somente quando há dados reais que as justificam
2. **Sem dados fake** — se não há dados, o painel não aparece (empty state)
3. **Cliente não vê bastidores** — portal do cliente jamais recebe sugestões de workflow interno, financeiro ou comercial
4. **Ação humana primeiro** — nenhuma sugestão executa ação automaticamente
5. **Falha silenciosa** — erros de persistência na tabela `ai_suggestions` não afetam a UX
6. **Servidor calcula, cliente exibe** — cálculo de sugestões acontece no server component; o client component só gerencia estado de UI

---

## Constraints não negociáveis

- Não conectar OpenAI, Claude API, Gemini, ElevenLabs, Meta, WhatsApp, Gmail ou Google Calendar nesta fase
- Não implementar voz real, microfone, reconhecimento de fala ou leitura automática
- Não criar dados fake fixos
- Não expor dados financeiros, prompts internos, gargalos de equipe ou dados de colaboradores para o cliente
- Não usar `service_role` no frontend
