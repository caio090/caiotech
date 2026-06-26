# Base Operacional do Cliente — LOKAT OS

## O que é

A Base Operacional do Cliente é a "pasta inteligente" de cada empresa dentro da LOKAT OS.
Em vez de manter pastas manuais no computador com PDFs de diagnóstico, prints de resultado
e textos de briefing perdidos no Drive, a LOKAT OS centraliza tudo isso em estrutura
consultável pela IA e pelo painel.

É o equivalente digital de um dossiê completo de cliente — mas vivo, atualizado e conectado.

---

## O que fica armazenado por cliente

### Dados estratégicos (tabela `client_context`)
- Segmento e descrição da empresa
- Objetivo principal e objetivos secundários
- Tom de voz
- Público-alvo e faixa etária
- Canais ativos (Instagram, Facebook, TikTok, YouTube...)
- Produtos e serviços (texto livre para contexto de IA)
- Instagram handle, site, cidade

### Conteúdo operacional (tabelas existentes)
- Conteúdos produzidos (`content_items`)
- Aprovações pendentes e históricas (`approvals`)
- Campanhas (`campaigns`)
- Briefings gerados pela IA
- Diagnósticos realizados

### Conexões e integrações (`meta_connections`)
- Conta Meta/Instagram conectada por organização
- Page ID e Instagram Business Account ID
- Status do token e escopo de permissões

### Métricas (via integrações futuras)
- Seguidores, alcance, impressões, engajamento
- Performance por mídia
- Dados de tráfego (Google Analytics — em breve)
- Dados de campanhas (Google Ads — em breve)

### Financeiro (tabelas existentes)
- Cobranças e pagamentos via Asaas
- MRR por cliente

---

## Como a IA usa essa base

A rota `/api/ai/diagnostico` recebe o contexto do cliente e gera análises.
A rota `/api/ai/briefing` usa o tom de voz, objetivo e canal para criar briefings.
A rota `/api/ai/legenda` usa os dados da marca para personalizar legendas.

No futuro, o campo `resumo_estrategico` da tabela `client_context` será o
"Context Pack" enviado ao modelo de IA para qualquer operação, garantindo
que a IA sempre fale com a voz certa para o cliente certo.

---

## Diferença do modelo manual (pastas no computador)

| Modelo manual (antes)         | LOKAT OS (agora)                        |
|-------------------------------|-----------------------------------------|
| Pasta por cliente no Drive    | Supabase com RLS por organização        |
| PDF de diagnóstico            | Diagnóstico gerado pela IA no painel    |
| Briefing em documento Word    | Briefing gerado e aprovado no fluxo     |
| Métricas no print do Instagram| Insights via API da Meta (em validação) |
| Aprovação por WhatsApp        | Link público de aprovação com histórico |
| Financeiro em planilha        | FinanceOS com cobranças automáticas     |

---

## Cenários de uso por tipo de conta

### Agência gerenciando múltiplos clientes
- Cada cliente tem seu próprio `client_context`
- A agência vê todos os clientes dela (filtro por `organization_id`)
- A IA gera conteúdo com o tom correto por cliente
- As conexões Meta são separadas por cliente

### Empresa/autônomo usando a própria conta
- O `client_context` é o próprio negócio
- A Meta conecta a conta pessoal da empresa
- Os insights mostram dados reais do Instagram

### Cliente final recebendo o serviço
- Acessa o portal `/client` para ver aprovações e relatórios
- Não vê dados de outros clientes (RLS garante isolamento)
- Aprova conteúdos por link público sem precisar de login

---

## SQL necessário para ativar

1. `docs/supabase/35-meta-connections.sql` — conexões Meta por organização
2. `docs/supabase/36-client-context.sql` — base operacional por cliente

Ambos devem ser rodados manualmente no Supabase SQL Editor.

---

## Próximos passos (roadmap)

- [ ] Tela de edição do `client_context` no admin
- [ ] Geração automática do `resumo_estrategico` via IA
- [ ] Leitura de insights reais da Meta após SQL 35 rodar
- [ ] Exportação do "Context Pack" (PDF ou JSON) para uso externo
- [ ] Agente de KPIs lendo métricas automaticamente
