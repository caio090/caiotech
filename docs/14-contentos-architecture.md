# ContentOS — Arquitetura Estratégica

## 1. Conceito

ContentOS é o sistema de marketing estratégico da LOKAT OS. Não é só um criador de conteúdo — é a central de inteligência de marketing de cada cliente.

A ideia central: **estratégia → produção → aprovação → distribuição → resultado**, tudo em um só lugar, sem apps externos.

Princípio operacional: **A IA sugere. O humano aprova. A plataforma executa.**

---

## 2. Estrutura de Abas (9 tabs)

| # | Aba              | Rota Admin                          | Rota Staff                     | Descrição |
|---|------------------|-------------------------------------|--------------------------------|-----------|
| 1 | Visão Geral      | `/admin/contentos/home`             | `/contentos/home`              | Dashboard de notificações, aprovações pendentes e calendário resumido |
| 2 | Base Estratégica | `/admin/contentos/base-estrategica` | `/contentos/base-estrategica`  | Identidade de marca, posicionamento, tom de voz, personas |
| 3 | Campanhas        | `/admin/contentos/campanhas`        | `/contentos/campanhas`         | Ciclos estratégicos: objetivo, período, conteúdos, verba, resultado |
| 4 | Calendário       | `/admin/contentos/calendario`       | `/contentos/calendario`        | Calendário editorial com conteúdos agendados e publicados |
| 5 | Produção         | `/admin/contentos/producao`         | `/contentos/producao`          | Pipeline de produção: briefing → edição → revisão interna |
| 6 | Distribuição     | `/admin/contentos/distribuicao`     | `/contentos/distribuicao`      | Tráfego pago: peças aprovadas, verbas, públicos, status |
| 7 | Insights         | `/admin/contentos/insights`         | `/contentos/insights`          | Performance: publicados, pendentes, distribuição por status/tipo/canal |
| 8 | Aprovações       | `/admin/contentos/aprovacoes`       | `/contentos/aprovacoes`        | Aprovações de conteúdo pelo cliente |
| 9 | Relatórios       | `/admin/contentos/relatorios`       | `/contentos/relatorios`        | Relatórios mensais: digital, físico, PDF, WhatsApp |

---

## 3. Base Estratégica

Concentra o que o cliente é como marca:

- **Identidade**: nome, segmento, cidade, Instagram
- **Posicionamento**: tom de voz, objetivos, canais
- **Documentos futuros**: Guia de marca, Personas, Calendário editorial, Manual do Instagram, Análise de concorrentes

Dados originam do `onboarding_profiles` e `clients`. Sem dados = empty state.

---

## 4. Campanhas

Cada campanha é um ciclo estratégico com:
- Objetivo (vender, leads, engajamento)
- Período (início e fim)
- Público e segmentação
- Verba sugerida e canal
- Status: `planejada → ativa → pausada → finalizada`
- Conteúdos vinculados via `campaign_id` em `content_items`

Tabela: `content_campaigns` (SQL 18)

---

## 5. Calendário Editorial Inteligente

Exibe conteúdos por data de publicação. Sidebar mostra lista do mês.
Clicar em item abre modal com detalhes (não navega para outra página).

Integração futura: sugestão automática de pauta baseada em datas comemorativas e histórico de desempenho.

---

## 6. Pipeline de Produção

Fluxo de status dos conteúdos em execução:

```
ideia → briefing → em_producao → edicao → revisao_interna → enviado_aprovacao
```

Conexão operacional:
- Ao enviar para produção em `aprovacoes`, cria tarefa em `operational_tasks`
- Quando tarefa vai para `concluido` no Kanban, conteúdo avança para `pronto_para_agendar`
- FK: `operational_tasks.content_item_id → content_items.id`

---

## 7. Distribuição / Tráfego

Gerencia campanhas pagas (futura integração Meta Ads):

- Identifica peças com potencial de anúncio (pós-aprovação)
- Sugere objetivo, público, verba e duração
- Status: `sugerido → aprovado → rodando → pausado → finalizado`
- Dados de desempenho: alcance, CPM, CPC, conversões
- Alertas de baixo desempenho

Tabela: `content_distribution` (SQL 18)

**Regra de ouro**: nenhum centavo gasto sem aprovação humana.

---

## 8. Insights

Visão de performance baseada em dados internos (agora) e externos (futuro):

- KPIs: total, publicados, aguardando aprovação, prontos p/ agendar
- Distribuição por status, tipo e canal
- Futura integração: Instagram Insights, Meta Ads, Google Analytics

---

## 9. Aprovações

Fluxo principal de aprovação do cliente:

- Admin envia conteúdo para aprovação → `status = 'enviado_aprovacao'`
- Cliente aprova/solicita ajuste
- Ao aprovar e enviar para produção: `content_items.status = 'em_producao'`
- Abertura automática via `?approval=<id>` na URL (deep link)

---

## 10. Relatórios

Relatórios mensais gerados pela equipe Lokat:

- Dados digitais: publicações, alcance, engajamento
- Dados físicos do cliente (se fornecidos): curva ABC, vendas
- PDF executivo (futura geração automática)
- Resumo WhatsApp
- Histórico de envios

---

## 11. Papéis e Acesso

### Acesso completo à ContentOS
- `admin`: acesso a `/admin/contentos/*` com seleção de cliente via `?client=<id>`

### Acesso operacional (staff)
- `social_media`, `designer`, `editor`, `videomaker`, `gestor_trafego`: acesso a `/contentos/*` com cliente via `localStorage`
- Devem selecionar cliente em `/contentos/selecionar-cliente` antes de usar

### Acesso do cliente
- `client` (owner): acesso a `/contentos/*` via owner lookup (sem localStorage)
- Vê apenas seus próprios dados
- **Não vê**: operacional interno, financeiro da Lokat, prompts, bastidores

---

## 12. Regra IA/Humano

Toda sugestão gerada por IA deve ser aprovada por um humano antes de:
- Entrar em produção
- Ser publicada
- Gerar gasto em tráfego pago

Não há automação sem checkpoint humano.

---

## 13. Separação de Contextos

| Contexto     | Rota         | clientId        |
|--------------|--------------|-----------------|
| Admin        | `/admin/contentos/*` | `?client=<id>` na URL |
| Staff        | `/contentos/*`       | `localStorage[ACTIVE_CLIENT_KEY]` |
| Client       | `/contentos/*`       | `clients.owner_id = auth.uid()` |

**Nunca misturar**: admin não usa localStorage, staff não usa query param como fonte primária, cliente vê apenas seus dados.

---

## 14. Conexão com Operacional

ContentOS cria a estratégia e o briefing. Operacional executa.

Fluxo:
1. Conteúdo aprovado pelo cliente → admin marca "enviar para produção"
2. `content_items.status = 'em_producao'`
3. Tarefa criada em `operational_tasks` com `content_item_id`
4. Operacional executa no Kanban
5. Tarefa vai para `concluido` → `content_items.status = 'pronto_para_agendar'`

---

## 15. Banco de Dados

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `content_items` | Conteúdos com status, tipo, canal, data agendada |
| `approvals` | Aprovações enviadas ao cliente |
| `operational_tasks` | Tarefas de produção com `content_item_id` |
| `content_campaigns` | Campanhas estratégicas (SQL 18) |
| `content_distribution` | Distribuição paga (SQL 18) |
| `onboarding_profiles` | Base estratégica do cliente |

### Colunas adicionadas

`content_items`:
- `production_completed_at TIMESTAMPTZ` (SQL 16)
- `scheduled_channel TEXT` (SQL 16)
- `campaign_id UUID → content_campaigns` (SQL 18)

`operational_tasks`:
- `content_item_id UUID → content_items` (SQL 16)

---

## 16. Integrações Futuras (fora de escopo agora)

- Meta Ads API: criar campanha, puxar resultado, otimizar
- Instagram Insights: alcance, engajamento, seguidores
- Google Analytics: tráfego e conversões
- Google Calendar: sincronizar datas de publicação
- WhatsApp Business API: envio de relatórios
- Canva API: criar artes dentro da plataforma
- ElevenLabs: narração de vídeos
- IA generativa: sugestão de pauta, roteiro, legenda

---

## 17. Sugestões Inteligentes (fase futura)

- Sugestão de pauta baseada em: histórico, sazonalidade, concorrentes, tendências
- Sugestão de legenda por tipo de conteúdo
- Sugestão de roteiro para vídeo
- Alerta de conteúdo com alto potencial para tráfego pago
- Alerta de melhor horário de publicação por canal

---

## 18. Documentos Estratégicos (fase futura)

Cada cliente terá documentos gerados e versionados:

- Guia de Marca (tom de voz, cores, fontes)
- Personas (público-alvo detalhado)
- Calendário Editorial Anual
- Manual de Instagram
- Análise de Concorrentes
- Plano de Conteúdo Mensal

---

## 19. Integrações de Design (fase futura)

- Canva: criar e exportar artes direto da plataforma
- Biblioteca de assets do cliente
- Templates por formato (Feed, Stories, Reels, Carrossel)

---

## 20. Lokat Voice Tech (fase futura)

- Narração em voz sintética para vídeos e reels
- Transcrição automática para legenda
- Sugestão de script por tom de voz do cliente
- Nenhuma implementação real agora — apenas estrutura visual

---

## 21. Permissões Técnicas (revisão)

### O que o admin pode fazer

- Ver e editar conteúdos de qualquer cliente
- Criar briefings, enviar para aprovação, marcar como produzido
- Aprovar distribuição paga
- Gerar relatórios
- Gerenciar campanhas

### O que o staff pode fazer

- Ver conteúdos do cliente selecionado no localStorage
- Executar tarefas operacionais vinculadas a conteúdos
- Visualizar calendário, produção, aprovações e insights

### O que o cliente pode fazer

- Ver seus próprios conteúdos e aprovações
- Aprovar ou solicitar ajuste em conteúdos
- Ver calendário e insights próprios
- **Não pode ver**: dados de outros clientes, operacional interno, financeiro da Lokat

---

## 22. Checklist de Implementação

### Fase 1 — Estrutura base (concluída)

- [x] 9 abas no admin: Visão Geral, Base Estratégica, Campanhas, Calendário, Produção, Distribuição, Insights, Aprovações, Relatórios
- [x] 9 abas no staff: mesma estrutura
- [x] Sidebar admin atualizada (`_contentos-subnav.tsx`)
- [x] Sidebar staff atualizada (`app-sidebar.tsx` variante `contentos`)
- [x] SQL 16: colunas de ciclo de produção
- [x] SQL 18: tabelas `content_campaigns` e `content_distribution`
- [x] Fix: modal de aprovação abre na página (não navega)
- [x] Fix: envio para produção atualiza `content_items.status = 'em_producao'`
- [x] Fix: kanban `concluido` → `content_items.status = 'pronto_para_agendar'`
- [x] Fix: calendário sidebar abre modal, não navega
- [x] Fix: bug de redirecionamento errado (client_id perdido ao navegar)
- [x] Fix: URL `?client=` tem prioridade sobre localStorage no admin

### Fase 2 — Dados reais e campanhas (próxima)

- [ ] Criar/editar campanhas (`content_campaigns`)
- [ ] Vincular conteúdos a campanhas
- [ ] Pipeline de distribuição com aprovação
- [ ] Relatórios manuais (admin preenche dados e envia)
- [ ] Documentos estratégicos por cliente

### Fase 3 — Integrações externas (futuro)

- [ ] Meta Ads API
- [ ] Instagram Insights
- [ ] Google Calendar
- [ ] WhatsApp relatório
- [ ] IA generativa (sugestão de pauta, roteiro, legenda)
