# Créditos de IA — Arquitetura LOKAT OS

## Conceito

Cada ação de IA na LOKAT OS consome créditos mensais incluídos no plano do usuário.
Quando os créditos acabam, a ação é bloqueada com mensagem amigável — sem cobrar automaticamente.

---

## Tipos de consumo

| Ação | Créditos estimados | Módulo |
|---|---|---|
| Diagnóstico de marca | 10 | ContentOS / Dashboard |
| Briefing de campanha | 5 | ContentOS |
| Legenda de post | 2 | ContentOS |
| Roteiro para vídeo | 5 | RecOS |
| Calendário editorial (mês) | 8 | ContentOS |
| Geração de imagem | 15 | ContentOS / Anúncios |
| Geração de carrossel | 20 | ContentOS |
| Variações de anúncio (3x) | 10 | Anúncios |
| Relatório inteligente | 8 | Relatórios |
| Lokat Voice (por sessão) | 3 | Global |

---

## Estrutura de dados planejada

### Tabela `ai_credit_plans` (por plano de assinatura)
```sql
id                uuid primary key
plan_name         text         -- basico | profissional | agencia | enterprise
monthly_credits   integer      -- créditos incluídos por mês
rollover          boolean      -- acumula créditos não usados?
created_at        timestamptz
```

### Tabela `ai_credit_balances` (saldo por organização/usuário)
```sql
id                uuid primary key
user_id           uuid references auth.users(id)
organization_id   uuid  -- quando organizations existir
plan_id           uuid references ai_credit_plans(id)
credits_total     integer   -- créditos do ciclo atual
credits_used      integer   -- créditos consumidos
cycle_start       date      -- início do ciclo mensal
cycle_end         date      -- fim do ciclo mensal
created_at        timestamptz
updated_at        timestamptz
```

### Tabela `ai_credit_usage` (histórico de consumo)
```sql
id                uuid primary key
user_id           uuid references auth.users(id)
organization_id   uuid
action_type       text         -- diagnostico | briefing | legenda | roteiro | imagem ...
credits_consumed  integer
context           jsonb        -- client_id, content_id, etc.
created_at        timestamptz
```

---

## Regras de negócio

1. Antes de executar qualquer ação de IA, verificar saldo: `credits_total - credits_used >= custo_da_acao`
2. Se saldo insuficiente: retornar `{ ok: false, reason: "no_credits", message: "Seus créditos de IA acabaram. Renova em X dias ou contrate créditos extras." }`
3. Nunca bloquear silenciosamente — sempre explicar o motivo e oferecer caminho
4. Créditos resetam no início de cada ciclo mensal (não no dia 1 — no aniversário da assinatura)
5. Admin pode ver consumo de toda a organização

---

## Próximos passos para implementar

1. Criar SQL para as três tabelas acima (`37-ai-credits.sql`)
2. Criar `GET /api/ai/credits` — retorna saldo do usuário autenticado
3. Criar middleware `checkAiCredits(action, cost)` para chamar antes de cada ação de IA
4. Criar tela `/admin/configuracoes#creditos` ou `/admin/financeiro#creditos` mostrando:
   - Saldo atual
   - Histórico de uso (últimas 30 ações)
   - Data do próximo reset
5. Adicionar badge de saldo no header do painel

---

## Status atual

**Não implementado.** As rotas de IA existentes (`/api/ai/diagnostico`, `/api/ai/briefing`, etc.)
não verificam créditos ainda. Este documento serve como spec para a implementação futura.

Cobrança real de créditos extras: **fora do escopo atual** — não implementar sem decisão explícita.
