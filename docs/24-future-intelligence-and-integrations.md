# LOKAT OS — Inteligência Futura e Integrações Estratégicas

**Status:** Backlog estratégico — nada aqui será implementado no ciclo atual  
**Criado em:** 2026-06-25  
**Contexto:** Visão de médio/longo prazo para expandir a inteligência da plataforma  
**Não alterar:** cronograma atual, ContentOS, FinanceOS, REC, landing, Supabase, Vercel

---

## 1. Resumo da Visão

A LOKAT OS evolui de plataforma operacional para **sistema de inteligência de marketing**.  
O ciclo atual entrega a base: conteúdo, aprovações, leads, financeiro, notificações e IA inicial.  

O que vem depois são **camadas transversais de inteligência** — não módulos isolados — que tornam o sistema capaz de:

- Ler o que está acontecendo (KPIs, calendário, leads, financeiro)
- Cruzar com o que vai acontecer (trend radar, datas comerciais, sazonalidade)
- Recomendar ações concretas com base em padrão de cada cliente
- Conectar dados de plataformas externas (Meta, WhatsApp) de forma segura por organização

O princípio central: **a plataforma deve saber mais sobre o negócio do cliente do que o próprio cliente percebe no dia a dia.**

---

## 2. Pilares de Conteúdo no Funil

### Onde entra
Camada interna da ContentOS. Não é módulo separado.  
Cada conteúdo (briefing, post, vídeo, stories) receberá uma tag de funil no momento da criação ou retroativamente por IA.

### Funil sugerido

| Etapa | Função |
|---|---|
| **Atração** | Trazer novos olhos: Reels virais, tráfego, SEO, colaborações |
| **Educação** | Construir entendimento: tutoriais, explicações, bastidores |
| **Consideração** | Quebrar objeções: comparativos, diferencial, cases |
| **Conversão** | Gerar ação: oferta, CTA, promoção, link na bio |
| **Retenção** | Manter o cliente ativo: conteúdo pós-compra, comunidade |
| **Autoridade** | Posicionar a marca: opinião, posicionamento, premiações |
| **Relacionamento** | Humanizar: bastidores, equipe, valores, interação |
| **Prova social** | Validar: depoimentos, UGC, resultado de cliente |
| **Oferta** | Produto/serviço direto: campanha sazonal, lançamento |
| **Institucional** | Identidade: missão, história, cultura, estrutura |

### O que a IA fará com isso

Analisar o calendário editorial do cliente e identificar desequilíbrios:

- `"Nos últimos 30 dias, 68% dos posts foram Institucional. Apenas 4% foram Conversão."`
- `"Cliente tem campanha ativa mas zero Prova Social no mês."`
- `"Calendário com forte topo de funil e gap total no meio. Educação está ausente."`
- `"Boa frequência de Oferta, mas nenhum post de Relacionamento. Pode gerar fadiga de venda."`

### Implementação futura

1. Adicionar campo `funnel_stage` em `content_briefs` e `calendar_items`
2. Criar enum: `attraction | education | consideration | conversion | retention | authority | relationship | social_proof | offer | institutional`
3. Agente de análise roda periodicamente por `organization_id + client_id`
4. Resultado aparece em Insights como sugestão, não como alerta obrigatório

---

## 3. Agente de Leitura de KPIs

### Onde entra
Camada transversal. Alimenta o módulo de **Insights / Sugestões Inteligentes**.  
Não é tela nova — é inteligência que aparece onde já existe: dashboard, ContentOS, FinanceOS, leads.

### Fontes de dados

**Internas (disponíveis hoje ou em breve):**
- Calendário editorial (conteúdos criados vs publicados)
- Aprovações (tempo médio, travamentos, responsável)
- Leads (origem, status, tempo sem follow-up)
- Propostas (abertas, aceitas, perdidas, expiradas)
- Financeiro (recebidos, vencidos, MRR, cobrança sem retorno)
- Tarefas operacionais (atraso, bloqueio, responsável inativo)

**Externas (futuras — dependem de integração):**
- Meta Ads (custo por resultado, frequência, CTR, ROAS)
- Instagram Insights (alcance, salvamentos, perfis alcançados)
- WhatsApp Business API (taxa de resposta, abertura)

### Exemplos de alertas

```
[ContentOS]
• Conteúdo sem publicação há 7 dias — cliente ativo com calendário parado
• 3 aprovações travadas há mais de 48h — gargalo na equipe ou no cliente
• Stories performando melhor que feed — sugestão: aumentar frequência de Stories

[Leads/CRM]
• Lead de campanha paga entrou há 3 dias sem follow-up
• Proposta enviada há 5 dias sem visualização — enviar lembrete?
• 4 leads do mesmo segmento este mês — padrão de interesse identificado

[Meta Ads]
• Criativo X com CTR 3x acima da média — reforço pago recomendado
• Campanha com frequência acima de 4 — risco de fadiga de audiência
• ROAS abaixo de 1.5 nos últimos 3 dias — alerta de desempenho

[Financeiro]
• Cobrança vencida há 10 dias sem retorno — follow-up necessário
• MRR do cliente X subiu 20% — oportunidade de upsell
• 3 cobranças recorrentes no mesmo dia — risco de churn concentrado
```

### Arquitetura conceitual

```
[Fontes de dados] → [Normalização] → [Agente LLM] → [Insights store] → [UI]
```

- O agente roda por `organization_id` + `client_id`
- Insights ficam em tabela `ai_insights` (já prevista)
- Prioridade: `critical | warning | suggestion | opportunity`
- Cada insight tem `source_module`, `entity_id`, `expires_at`
- Usuário pode marcar como "visto", "ignorar" ou "snooze"

### Dependência de IA
OpenAI GPT-4o para classificação e geração de texto dos alertas.  
A lógica de detecção (dias sem publicação, aprovação travada) pode rodar em regras simples antes de passar para IA.

---

## 4. Trend Radar

### Onde entra
Camada de antecipação dentro da ContentOS.  
Aparece como barra ou painel lateral no calendário editorial.

### Objetivo
A ContentOS não pode reagir apenas ao que já aconteceu.  
Precisa antecipar oportunidades com base em datas, tendências e segmento do cliente.

### Fontes de dados futuras

**Calendário de datas (hard-coded + editável):**
- Datas nacionais: Carnaval, Semana Santa, Dia das Mães, Copa, São João, Black Friday, Natal
- Datas regionais: feriados estaduais, eventos locais, festas de cidade
- Datas do segmento: datas específicas por tipo de negócio (ex.: Dia do Nutricionista, Dia do Arquiteto)
- Datas da empresa: aniversário da marca, lançamentos internos

**Tendências (futuras APIs):**
- Google Trends por região e segmento
- Meta Topics em ascensão
- Buscas em alta no segmento do cliente

### Exemplo de saída

```
📅 Faltam 20 dias para São João
   → Este cliente é do segmento: Alimentação (Fortaleza - CE)
   
   Sugestões geradas:
   • Reels de bastidores com tema junino
   • Oferta de combo sazonal com nome temático
   • Decoração da loja (ver Merchandising)
   • Anúncio local com cota de 15 dias
   • Story de contagem regressiva
   • Destaque de arraial para Instagram
```

### Implementação futura

1. Tabela `trend_calendar` com datas e pesos por segmento/região
2. Campo `segment` em `clients` (já parcialmente presente)
3. Agente de sugestão roda `30 dias antes` de cada data relevante
4. Resultado aparece no painel ContentOS como card de "Oportunidade próxima"
5. Um clique cria rascunho de briefing pré-preenchido

---

## 5. Visual Merchandising Sazonal

### Onde entra
Módulo futuro ligado à **Base Estratégica do Cliente**.  
Não é prioridade do ciclo atual. Entra quando ContentOS e RecOS estiverem estabilizados.

### Objetivo
Ajudar empresas com loja física a preparar ambiente, vitrine e fachada para datas comerciais.

### Dados de entrada (coletados no onboarding ou perfil do cliente)

- Fotos da loja, fachada e interior
- Tipo de negócio e segmento
- Identidade visual da marca
- Datas quentes priorizadas
- Orçamento disponível para ativação
- Materiais disponíveis (banner, totem, adesivo, bandeirinha etc.)
- Medidas aproximadas de vitrine/fachada, se disponível

### Saídas possíveis

- Sugestões de decoração com referências visuais
- Checklist de materiais por data
- Briefing automático para designer (ex.: "Banner 2m x 1m, tema São João, cores da marca X")
- Briefing para equipe de loja (o que montar, onde colocar, como fotografar)
- Conexão com ContentOS: ativação na loja → conteúdo de bastidores → campanha de tráfego
- Conexão com RecOS: sessão de fotos/vídeos da decoração como entrega audiovisual

### Datas contempladas
São João · Carnaval · Natal · Dia das Mães · Dia dos Namorados · Black Friday · Copa · Aniversário da loja · Eventos locais

### Nome do módulo futuro
`Ativações / Loja Física / Merchandising`  
Pode ser seção dentro do painel do cliente ou módulo separado com acesso por permissão.

---

## 6. Conexão Meta por Organização, Agência e Cliente

### O problema
A LOKAT OS atende múltiplos perfis simultaneamente:
- A própria Lokat (agência)
- Clientes diretos da Lokat
- Outras agências que usarão a plataforma
- Clientes dessas agências
- Empresários e autônomos operando sozinhos

Uma conexão Meta única e global **não funciona** nesse modelo.  
Cada entidade tem seus próprios ativos, permissões e tokens.

### Tipos de organização relevantes

| Tipo | Descrição |
|---|---|
| `lokat_admin` | Acesso total. Conecta seus próprios ativos Meta. |
| `agencia` | Conecta seus ativos e gerencia contas de clientes. |
| `empresa` | Conecta seus próprios ativos. Não gerencia terceiros. |
| `autonomo` | Idem empresa, escala reduzida. |
| `cliente_atendido` | Autoriza acesso aos seus ativos para a agência gestora. |

### Ativos Meta por tipo

```
Business Manager
└── Ad Account (conta de anúncios)
└── Page (página do Facebook)
└── Instagram Account (conta profissional)
└── Pixel (rastreamento)
└── Catalog (catálogo de produtos)
└── WhatsApp Business Account (WABA)
```

### Tabela futura: `meta_connections`

```sql
-- Proposta conceitual — NÃO implementar agora
create table meta_connections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id),
  client_id        uuid references clients(id), -- null se for da própria org
  connected_by     uuid not null references profiles(id),
  provider         text not null default 'meta',

  -- Ativo conectado
  asset_type       text not null,  -- business | page | instagram_account | ad_account | pixel | waba
  asset_id         text not null,
  asset_name       text,

  -- Token
  access_token     text,           -- NUNCA expor no frontend / NUNCA em NEXT_PUBLIC_
  token_type       text,           -- user | system | page
  scopes           text[],         -- ['ads_read','instagram_basic','pages_read_engagement']
  expires_at       timestamptz,
  token_status     text default 'active', -- active | expired | revoked | error

  -- Metadados
  status           text default 'active',
  last_verified_at timestamptz,
  error_message    text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
```

### Fluxo de autorização (conceitual)

```
1. Usuário clica "Conectar Meta" na configuração da organização
2. Redirect para Meta Login (OAuth 2.0)
3. Usuário autoriza scopes necessários no Meta Business
4. Meta retorna code → backend troca por access_token
5. Token é salvo em meta_connections (servidor, nunca frontend)
6. Leitura de insights roda via API Route (/api/meta/insights)
7. Dados são armazenados normalizados por organization_id + client_id
```

### Scopes necessários por funcionalidade

| Funcionalidade | Scopes |
|---|---|
| Insights de posts | `instagram_basic`, `pages_read_engagement` |
| Insights de ads | `ads_read`, `business_management` |
| Publicação de conteúdo | `instagram_content_publish`, `pages_manage_posts` |
| Leitura de leads | `leads_retrieval` |
| WhatsApp mensagens | `whatsapp_business_messaging` |

### Regras críticas

- Uma agência **não pode** ver ativos de outra agência
- Um cliente **deve autorizar** explicitamente antes de a agência ler seus dados
- Tokens ficam **no servidor** — nunca em variáveis `NEXT_PUBLIC_`
- Expiração de token gera alerta para o usuário reconectar
- Revogar acesso remove o token e interrompe todas as leituras

---

## 7. Segurança: Autenticação, Autorização e Controle de Acesso

### Os três níveis

```
┌─────────────────────────────────────────┐
│  AUTENTICAÇÃO: Quem é você?             │
│  → Login via Supabase Auth              │
│  → JWT validado pelo servidor           │
│  → Nunca confiar apenas no frontend     │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  AUTORIZAÇÃO: O que você pode acessar?  │
│  → Role: admin, agência, cliente,       │
│    operacional, designer, videomaker    │
│  → Definido em profiles.role            │
│  → Verificado em proxy.ts (middleware)  │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  CONTROLE DE ACESSO: Quais dados?       │
│  → organization_id em cada tabela       │
│  → RLS no Supabase por organização      │
│  → Uma org nunca vê dados de outra org  │
│  → Cliente vê apenas seus próprios dados│
└─────────────────────────────────────────┘
```

### Regras de isolamento de dados

| Regra | Descrição |
|---|---|
| Isolamento por org | `WHERE organization_id = auth.uid_org()` em todas as queries |
| Cliente separado | Dados do cliente nunca aparecem no painel de outra agência |
| Operacional limitado | Não acessa dados financeiros sensíveis de outras orgs |
| Admin interno | Apenas `lokat_admin` pode ver dados de múltiplas orgs |
| Token Meta | Nunca exposto no navegador, nunca em `NEXT_PUBLIC_` |
| API Keys | Todas as chaves ficam em variáveis de servidor (`process.env.X`) |

### Riscos documentados

1. **Token Meta global** — Se um único token for usado para todos os clientes, vazamento expõe todos os ativos. Solução: token por `meta_connections` row, com `organization_id` obrigatório.

2. **Service Role no frontend** — `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser usada em componentes client-side. Toda operação privilegiada é API Route server-side.

3. **Dados entre organizações** — Sem `WHERE organization_id = X`, queries podem retornar dados de outras orgs. RLS é a segunda linha de defesa; a primeira é filtrar na query.

4. **Expiração silenciosa de tokens** — Token Meta expira sem notificação. Implementar webhook de expiração ou verificação periódica com alerta para reconexão.

5. **Permissões de role hardcoded** — Se `role` for confiado apenas do JWT sem validação no banco, um usuário pode escalar privilégios. `profiles.role` no Supabase é a fonte de verdade.

---

## 8. O Que Entra Agora (ciclo atual)

> **Nenhuma das ideias acima entra no ciclo atual.**

O ciclo atual foca em:
- LOKAT OS publicada e estável em produção
- ContentOS funcional (briefings, calendário, aprovações)
- RecOS visual e acessível publicamente
- FinanceOS inicial (cobranças, Asaas sandbox)
- Supabase conectado com RLS funcionando
- Vercel + GitHub com deploy automático
- OpenAI integrado nos pontos iniciais (diagnóstico, sugestões)
- Correções de: IA, notificações, convites, diagnóstico, leads, integrações

---

## 9. O Que Fica Para Depois

| Feature | Dependência principal | Quando considerar |
|---|---|---|
| Pilares de funil na ContentOS | ContentOS estável + OpenAI | Após ciclo atual |
| Agente de KPIs | Todas as fontes de dados conectadas | Pós-ContentOS + FinanceOS |
| Trend Radar | Tabela de datas + segmento do cliente | Pós-ContentOS v2 |
| Visual Merchandising | RecOS estável + onboarding completo | Médio prazo |
| Conexão Meta | Meta App aprovado + backend OAuth | Próximo ciclo grande |
| WhatsApp Insights | WABA aprovado pela Meta | Longo prazo |

---

## 10. Próximos Passos Recomendados (quando chegar a hora)

1. **Pilares de funil** — adicionar campo `funnel_stage` em `content_briefs` (1 dia de trabalho, baixo risco)

2. **Trend calendar** — criar tabela `trend_calendar` com datas hardcoded inicialmente, depois abrir para configuração por organização

3. **Meta OAuth** — criar fluxo de conexão isolado (`/configuracoes/integracoes/meta`) com backend exclusivo antes de ler qualquer dado

4. **Tabela `meta_connections`** — implementar somente após OAuth aprovado e testado com conta sandbox

5. **Agente de KPIs** — implementar como job periódico (Supabase Edge Function ou cron no servidor) que alimenta tabela `ai_insights` já existente

6. **Visual Merchandising** — avaliar como expansão do módulo de cliente, não como módulo independente

---

*Este documento é registro estratégico interno. Nenhum código de produção foi alterado.*  
*Revisar e atualizar conforme ciclos de produto avançarem.*
