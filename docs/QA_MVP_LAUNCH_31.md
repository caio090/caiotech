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
- [ ] Sidebar admin exibe itens corretos (sem nomes antigos como "Candy")

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
