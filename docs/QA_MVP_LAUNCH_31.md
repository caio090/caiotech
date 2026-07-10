# QA — MVP Launch Checklist (até 31/07)

*Criado: 2026-07-07. Atualizar a cada sprint.*

---

## Como usar

Marcar cada item como `[x]` ao testar. Testar em produção (`https://www.lokat.com.br`) E local (`http://localhost:3000`).

---

## 1. Visitante — Landing pública (`/`)

- [ ] Landing carrega sem erro de JS no console
- [ ] Ticker animado aparece no topo
- [ ] Hero renderiza título + CTAs
- [ ] CTA "Entrar na lista beta" → redireciona para `/pre-acesso`
- [ ] CTA "Diagnóstico gratuito" → redireciona para `/diagnostico`
- [ ] CTA "Falar com a Lokat" → abre WhatsApp (wa.me) em nova aba
- [ ] Botão "Ou agendar demonstração →" → abre modal conversacional
- [ ] Seção "O Problema" renderiza 5 cards
- [ ] Jornada 7 etapas renderiza
- [ ] Seção REC OS renderiza (nome público do módulo: REC OS — não ContentOS)
- [ ] Seção "Para quem" renderiza
- [ ] FAQ renderiza e acordeão funciona
- [ ] Seção beta / waitlist renderiza
- [ ] Footer ou bottom nav sem link quebrado

---

## 2. Lead capture — Modal local ("Agendar demonstração")

- [ ] Modal abre ao clicar no botão da landing
- [ ] Modal fecha ao clicar fora ou pressionar Escape
- [ ] Passo 1 — pede nome (required: não avança vazio)
- [ ] Passo 2 — pede e-mail (required: não avança vazio ou inválido)
- [ ] Passo 3 — pede WhatsApp (opcional: pode pular)
- [ ] Passo 4 — pede perfil (seleção de opções, avança automático)
- [ ] Passo 5 — pede maior gargalo (seleção de opções, avança automático)
- [ ] Passo 6 — pede objetivo (seleção de opções, avança automático e envia)
- [ ] Submit retorna `ok: true` e exibe tela de confirmação
- [ ] Lead aparece em `/admin/super/waitlist` com `source = site_modal`
- [ ] Submit com e-mail duplicado retorna `ok: true, duplicate: true` (não exibe erro)
- [ ] Voltar funciona em cada passo
- [ ] Reabertura do modal reseta para o passo 1

---

## 3. Lead capture — Formulário completo (`/pre-acesso`)

- [ ] Página carrega corretamente
- [ ] Submit com campos obrigatórios faltando exibe erro
- [ ] Submit válido retorna sucesso
- [ ] Lead aparece em `/admin/super/waitlist`
- [ ] E-mail duplicado exibe mensagem amigável (não erro de sistema)

---

## 4. Cadastro (`/criar-conta`)

- [ ] Em modo waitlist (sem convite/cupom): exibe gate com link para `/pre-acesso`
- [ ] Com `?invite=TOKEN` ou `?coupon=CODE`: exibe formulário de cadastro
- [ ] Formulário de cadastro valida campos obrigatórios
- [ ] Cadastro válido cria conta e redireciona corretamente

---

## 5. Login (`/login`)

- [ ] Formulário renderiza corretamente
- [ ] E-mail ou senha incorretos exibem mensagem de erro clara
- [ ] Login válido redireciona para o portal correto por role
  - [ ] `admin` / `super_admin` → `/admin/inicio`
  - [ ] `cliente` → `/client/home`
  - [ ] Social Media / Operacional → `/operacional/dashboard`
- [ ] Link "Esqueci minha senha" → `/recuperar-senha`
- [ ] Link "Recebi um convite" → campo de token de convite
- [ ] Modo demonstração (sem Supabase): mostra botões de role para navegar

---

## 6. Logout

- [ ] Botão "Sair" (ícone LogOut) visível na sidebar de cada portal
- [ ] Clicar em Sair faz signOut e redireciona para `/login` ou landing
- [ ] Após logout, tentar acessar rota protegida redireciona para `/login`

---

## 7. Portal cliente (`/client/home`)

- [ ] Página carrega sem erro
- [ ] Sidebar exibe: Início, Projeto, Conteúdos, Aprovações, Calendário, Resultados, Financeiro, Arquivos, Solicitações, Suporte, Configurações
- [ ] Botão Sair visível na sidebar
- [ ] `/client/financeiro` — exibe estado vazio "Nenhum plano ativo" (não quebra)
- [ ] `/client/aprovacoes` — carrega sem erro (estado vazio ok)
- [ ] `/client/calendario` — carrega sem erro

---

## 8. Portal Admin / Super Admin

- [ ] `/admin/inicio` carrega sem erro
- [ ] `/admin/dashboard` carrega sem erro
- [ ] `/admin/clientes` carrega sem erro
- [ ] `/admin/super/waitlist` carrega lista de leads
- [ ] `/admin/super/waitlist` — filtros de status funcionam
- [ ] `/admin/super/waitlist` — ação "marcar como contatado" funciona
- [ ] `/admin/super/waitlist` — ação "arquivar" funciona
- [ ] `/admin/super/accounts` carrega sem erro
- [ ] `/admin/super/leads` carrega sem erro
- [ ] `/admin/super/leads` — coluna "Tipo/Perfil" não exibe "novo_cadastro" cru (deve exibir "Cadastro legado" ou "Legado")
- [ ] `/admin/leads` carrega sem erro (CRM hub)
- [ ] `/admin/leads` — cards de origem exibem contagens corretas
- [ ] Sidebar admin exibe 10 itens (CRM removido — acessível via topbar)
- [ ] Topbar CRM (ícone Target) visível na navbar admin
- [ ] Topbar CRM exibe badge vermelho com contagem de leads "new" quando > 0
- [ ] Topbar Status (ícone Activity) visível para super_admin com "V1 XX%" e dias restantes
- [ ] `/admin/status` carrega sem erro e exibe progress bars V1 e V2
- [ ] `/admin/status` — milestones V1 exibem ícone correto por status (done/partial/pending)
- [ ] `/admin/status` — prazo "2026-07-31" e dias restantes exibidos corretamente
- [ ] `/admin/status` não exibe textos técnicos crus (SQL, auth.admin, fallback, profiles, scopes internos ou detalhes de infraestrutura)
- [ ] Meta Insights avançado exibe todos os 5 blocos (Gênero, Faixa etária, Cidades, Países, Horários) — com dados reais se disponíveis, ou estado vazio amigável se não
- [ ] Sidebar admin primeiro item é "Início" apontando para /admin/inicio
- [ ] /admin/inicio atalhos incluem CRM e Status V1
- [ ] CRM badge desaparece ao clicar no link CRM (não aguarda próximo reload)
- [ ] Leads novos criados APÓS última visita ao CRM aparecem no badge; leads antigos não
- [ ] Coluna "Tipo" no CRM exibe badges coloridos (Cliente Lokat, Agência parceira, etc.) em vez de texto cru
- [ ] Botão Agente IA (ícone robô) visível em cada linha da tabela CRM
- [ ] Modal Agente IA abre com dados do lead (nome, origem, etapa, intenção)
- [ ] Modal Agente IA tem seletor de Tom (5 opções) e Objetivo (6 opções)
- [ ] Botão "Gerar abordagem" produz sugestão local com mensagem e próximo passo
- [ ] Clicar fora do modal Agente IA fecha o modal
- [ ] Sugestão gerada tem aviso "Sugestão local — revise antes de usar"
- [ ] Title do browser/Google: "LOKAT OS | Marketing, CRM e conteúdo com IA"
- [ ] Meta description visível no HTML source: contém "campanhas, leads, aprovações"
- [ ] OG title correto no HTML source
- [ ] Favicon visível no navegador (ícone L roxo/escuro, não genérico Next.js/Vercel)
- [ ] GrowthOS/FinanceOS não aparecem em metadata pública (title/description/OG)
- [ ] ContentOS não aparece como nome público em metadata
- [ ] /admin/relatorios > card "Relatório de Conteúdo" CTA leva para /admin/relatorios/conteudo, não para home da REC OS
- [ ] /admin/relatorios/conteudo carrega sem erro e exibe estado vazio honesto
- [ ] /admin/relatorios/conteudo tem link de volta para Dados & Insights
- [ ] /admin/conexoes exibe banner explicando contexto por cliente
- [ ] /admin/conexoes título exibe "Conexões — Integrações externas — configure por cliente"
- [ ] Trocar cliente na vinculação de ativos Meta atualiza qual cliente está sendo vinculado
- [ ] Duh Lanches aparece como conexão do cliente Duh, não como conexão global da plataforma
- [ ] /admin/super/accounts — coluna "Tipo" exibe badges coloridos (Interno Lokat, Agência parceira, Cliente direto, etc.) em vez de texto cru
- [ ] /admin/super/accounts — tipo "diagnostic_only" exibe "Lead / Diagnóstico" e não o valor bruto do banco
- [ ] /admin/super/accounts — role aparece como linha secundária abaixo do badge de tipo quando relevante
- [ ] /admin/clientes — cada card de cliente exibe bloco de integrações com badges Meta, Instagram, Brief, Diagnóstico
- [ ] /admin/clientes — badges de integração exibem cor diferente para conectado vs. não conectado
- [ ] /admin/leads — lead com status "accepted" exibe "OS ativo" abaixo do badge de etapa
- [ ] /admin/leads — lead com status "invited" exibe "Convite enviado" abaixo do badge de etapa
- [ ] Modal Agente IA exibe bloco de contexto com Empresa/Nicho, Acesso OS e Cidade (quando disponível)
- [ ] /admin/clientes — badge Meta exibe "Não configurado" (cinza/índigo) quando has_meta=false, não "Não conectado"
- [ ] /admin/clientes — badge Instagram exibe "Não configurado" quando has_instagram=false
- [ ] /admin/clientes — badge Brief exibe "Pendente" quando has_brief=false
- [ ] /admin/clientes — badge Diagnóstico exibe "Pendente" quando has_diagnostico=false
- [ ] Nenhum cliente herda badge "Meta conectado" de outro cliente (verificar Duh Lanches vs. outros)
- [ ] /admin/super/accounts — coluna "Portal OS" exibe "Ativo" apenas para role=cliente; não para admin/agencia
- [ ] /admin/super/accounts — coluna "Integrações" exibe apenas tipos planejados para o account_type do usuário
- [ ] "OS ativo" no CRM é derivado de launch_waitlist.status = 'accepted', não de client_id real (anotar limitação)
- [ ] "Convite enviado" no CRM é derivado de launch_waitlist.status = 'invited' (confirmado derivado de dados reais)
- [ ] Modal Agente IA exibe bloco "Lead convertido" somente quando status = invited ou accepted
- [ ] Integrações planejadas no modal Agente IA são baseadas em account_type, não em conexões reais
- [ ] Favicon exibe ícone L roxo/escuro (não triângulo Vercel) após remoção de src/app/favicon.ico
- [ ] /admin/super/accounts — coluna "Tipo" exibe "Não classificado" para contas com account_type null/nao_definido (não texto cru)
- [ ] /admin/super/accounts — botão "Classificar" em cada linha abre modal de classificação
- [ ] Modal classificação salva account_type via PATCH /api/admin/accounts/[id]/classification (sem alterar role)
- [ ] /admin/clientes — badges Meta/Instagram coloridos aparecem APENAS quando has_meta/has_instagram=true; false → "Não configurado" cinza
- [ ] /admin/clientes — badge needs_setup usa cor cinza neutra (não indigo)
- [ ] /admin/super/leads — coluna "Tipo" exibe select inline para leads da waitlist; legados somente leitura
- [ ] /admin/super/leads — mudar tipo no select salva imediatamente via PATCH /api/admin/waitlist
- [ ] /admin/super/waitlist — coluna "Tipo" usa badges coloridos (Não classificado para null/nao_definido)
- [ ] /admin/conexoes — seletor de cliente aparece no topo quando há clientes cadastrados
- [ ] /admin/conexoes — selecionar cliente filtra conexões OlaClick para aquele cliente
- [ ] /admin/conexoes — URL atualiza para ?client=<id> ao selecionar cliente
- [ ] /admin/conexoes — banner contextual muda texto ao selecionar cliente específico
- [ ] /admin/conexoes — cliente sem OlaClick mostra mensagem "nenhuma conexão" em vez de lista vazia
- [ ] /admin/conexoes — "Conectar Cardápio Digital" com cliente selecionado pré-preenche o cliente no modal

---

## 9. ContentOS (`/contentos`)

- [ ] `/contentos/home` carrega sem erro
- [ ] Sidebar exibe: Visão Geral, Base Estratégica, Campanhas, Calendário, Produção, Distribuição, Insights, Aprovações, Relatórios
- [ ] `/contentos/selecionar-cliente` carrega sem erro
- [ ] `/contentos/calendario` carrega sem erro
- [ ] `/contentos/aprovacoes` carrega sem erro
- [ ] Estados vazios são apresentáveis (não telas quebradas)

---

## 10. Operacional (`/operacional`)

- [ ] `/operacional/dashboard` carrega sem erro
- [ ] `/operacional/briefings` carrega sem erro
- [ ] `/operacional/kanban` carrega sem erro
- [ ] Sidebar operacional exibe itens corretos
- [ ] Estado vazio de tarefas é apresentável

---

## 11. Financeiro cliente (`/client/financeiro`)

- [ ] Carrega sem erro
- [ ] Exibe estado vazio "Nenhum plano ativo" (não tela quebrada)
- [ ] Serviços adicionais listados

---

## 12. Rotas inexistentes / erros

- [ ] Acessar rota inexistente não quebra com erro 500
- [ ] Usuário sem sessão tentando rota protegida → redireciona para `/login`
- [ ] POST `/api/leads/typebot` sem autenticação → retorna JSON (não HTML)
- [ ] POST `/api/leads/typebot` sem secret (env ausente) → `{ ok: true }` ou erro JSON
- [ ] GET `/api/leads/typebot` → retorna 405 Method Not Allowed em JSON

---

## 13. Mobile básico

- [ ] Landing não quebra em viewport < 375px
- [ ] Modal conversacional é usável em mobile
- [ ] Sidebar em mobile tem menu hamburguer ou scroll funcional
- [ ] Formulário `/pre-acesso` é usável em mobile

---

## Pendências conhecidas (não bloquear lançamento)

| Item | Motivo | Responsável |
|---|---|---|
| SQL 76 (colunas Typebot) | Precisa rodar no Supabase SQL Editor | Manual |
| `LOKAT_TYPEBOT_WEBHOOK_SECRET` na Vercel | Env var do webhook | Manual |
| Typebot: finalizar fluxo + publicar | Pausado intencionalmente | Próxima sprint |
| `app.lokat.io` SSL + Vercel | Domínio sem certificado | Infraestrutura |
| Integração de pagamento real | MVP não requer | Futura sprint |

---

## Melhorias futuras — documentadas, NÃO implementar agora

### P2 — Campo livre no modal (baixa prioridade)

O modal conversacional (`LeadConversationModal`) usa opções fixas nos passos de "maior gargalo" e "objetivo". Para leads com situações fora das opções, não há campo livre.

**Futuro:** nos passos com options, adicionar opção "Outro" que abre um `<input>` de texto inline para o usuário descrever sua situação específica. Não bloqueia o envio — apenas enriquece o dado.

### P3 — Rota `/operacional/kanban` (comportamento documentado)

`/operacional/kanban` não tem uma rota própria — ao acessar, redireciona para `/operacional/briefings` porque o Kanban é um toggle de visualização dentro da página de Briefings (não uma rota separada).

**Comportamento atual:** correto pelo design. O link "Kanban" na sidebar navega para `/operacional/briefings` com o Kanban como view alternativa.

**Futuro (se necessário):** criar rota `/operacional/kanban` com redirect para `/operacional/briefings?view=kanban` ou fazer a página de Briefings aceitar o parâmetro `view` para inicializar na visualização correta.

---

*Atualizar após cada deploy ou sessão de testes.*
