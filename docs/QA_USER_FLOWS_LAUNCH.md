# QA — Fluxos de Usuário para o Lançamento

*Criado: 2026-07-06. Atualizar sempre que novos fluxos forem implementados.*

---

## Como usar este documento

Execute cada fluxo manualmente antes de um deploy ou lançamento. Marque ✅ quando validado, ❌ quando falhar com descrição do problema.

---

## 1. Visitante público (sem conta)

| # | Ação | Resultado esperado |
|---|---|---|
| 1.1 | Acessar `/` | Landing carrega, header com "Entrar", ticker animado, seções visíveis |
| 1.2 | Clicar "Entrar na lista beta" (hero) | Redireciona para `/pre-acesso` |
| 1.3 | Clicar "Fazer diagnóstico" | Redireciona para `/diagnostico` |
| 1.4 | Clicar "Falar com a Lokat" | Abre WhatsApp com mensagem pré-preenchida |
| 1.5 | Clicar "Agendar demonstração" | Abre `LeadConversationModal` |
| 1.6 | Navegar pelo menu mobile (hamburger) | Menu abre/fecha corretamente |
| 1.7 | Clicar link "REC OS" no menu | Rola para seção `#rec-os` na home |
| 1.8 | Clicar link "Plataforma" no menu | Rola para seção `#plataforma` |
| 1.9 | Acessar `/planos` | Página de planos carrega sem header duplicado |
| 1.10 | Acessar `/rec` | Página Lokat.rec carrega (separada do REC OS) |

---

## 2. Lead beta — fluxo de inscrição na waitlist

| # | Ação | Resultado esperado |
|---|---|---|
| 2.1 | Acessar `/pre-acesso` | Formulário carrega sem header duplicado |
| 2.2 | Submeter formulário vazio | Validação de campos obrigatórios (nome + email no mínimo) |
| 2.3 | Submeter com email válido | `POST /api/launch/waitlist` retorna `{ ok: true }`, mensagem de sucesso exibida |
| 2.4 | Submeter mesmo email de novo | Retorna `{ ok: true, duplicate: true }`, mensagem "Você já está na lista..." |
| 2.5 | Verificar no Supabase | Registro aparece em `launch_waitlist` com `status = "new"` |
| 2.6 | Checar campos salvos | `name`, `email`, `phone`, `source`, `account_type`, `utm_source` (se presentes) |
| 2.7 | Simular erro de rede | Exibe mensagem de erro com código debug visível |

---

## 3. Conversa modal (LeadConversationModal)

| # | Ação | Resultado esperado |
|---|---|---|
| 3.1 | Clicar "Agendar demonstração" | Modal abre com animação, foco no primeiro campo |
| 3.2 | Fechar com ESC | Modal fecha |
| 3.3 | Fechar clicando fora | Modal fecha |
| 3.4 | Navegar pelas 5 perguntas | Barra de progresso avança corretamente |
| 3.5 | Voltar para pergunta anterior | Campo anterior preservado |
| 3.6 | Selecionar opção nas perguntas 3/4 | Avança automaticamente (sem clicar "Próximo") |
| 3.7 | Submeter completo | `POST /api/launch/waitlist` com `source="site_conversation"`, tela de confirmação |
| 3.8 | Verificar no Supabase | Registro salvo com `source = "site_conversation"` |

---

## 4. Empresa / autônomo (conta criada)

| # | Ação | Resultado esperado |
|---|---|---|
| 4.1 | Criar conta | Redireciona para `/criar-conta` ou `/pre-acesso` conforme LAUNCH_MODE |
| 4.2 | Login com email/senha | Redireciona para `/dashboard` |
| 4.3 | Acessar `/dashboard` | Dashboard carrega com dados do perfil |
| 4.4 | Ver diagnóstico `/diagnostico` | Formulário funcional, resultado gerado por IA |
| 4.5 | Acessar `/rec` (Lokat.rec) | Área de conteúdo audiovisual acessível |
| 4.6 | Fazer logout | Redireciona para `/` ou `/entrar` |

---

## 5. Agência (account_type = "agency")

| # | Ação | Resultado esperado |
|---|---|---|
| 5.1 | Login com conta de agência | Dashboard com visão multi-cliente |
| 5.2 | Navegar clientes | Lista de clientes carrega |
| 5.3 | Criar projeto para cliente | Briefing/OS vinculado ao cliente |
| 5.4 | Enviar link de aprovação | Link gerado, cliente acessa sem login |
| 5.5 | Cliente aprovar via link | Status atualiza no painel da agência |

---

## 6. Cliente de agência (acesso via convite)

| # | Ação | Resultado esperado |
|---|---|---|
| 6.1 | Receber link de aprovação | Abre página sem exigir login |
| 6.2 | Visualizar conteúdo | Conteúdo carrega com marca/contexto corretos |
| 6.3 | Aprovar | Status atualiza no sistema |
| 6.4 | Recusar ou comentar | Feedback registrado |

---

## 7. Super admin — Central de gestão

| # | Ação | Resultado esperado |
|---|---|---|
| 7.1 | Login com `role = super_admin` | Acesso ao menu `/admin/super` |
| 7.2 | `/admin/super/waitlist` | Lista `launch_waitlist` com paginação e filtros |
| 7.3 | Mudar status de lead para "contacted" | PATCH reflete no Supabase, UI atualiza |
| 7.4 | Mudar status para "invited" | Idem |
| 7.5 | Mudar status para "accepted" | Idem |
| 7.6 | Mudar status para "archived" | Idem |
| 7.7 | Deletar lead com confirmação | DELETE reflete no Supabase |
| 7.8 | `/admin/super/leads` | Mostra `launch_waitlist` + `admin_signups_view` mesclados |
| 7.9 | admin_signups_view entries | Badge "Origem legada", ações destrutivas desabilitadas |
| 7.10 | Painel diagnóstico (0 registros) | Exibe dicas de configuração (Vercel key, SQL Editor) |
| 7.11 | `/admin/super/accounts` | Lista usuários auth + perfis, modo degradado se falhar |
| 7.12 | `/admin/status` | Todos os módulos com status atualizado |

---

## 8. Integrações e dados externos

| # | Ação | Resultado esperado |
|---|---|---|
| 8.1 | Conexão OlaClick (cardápio digital) | Dados de pedido/faturamento puxados sem erro |
| 8.2 | Conexão Meta / Instagram | Métricas de alcance carregam |
| 8.3 | Webhook Typebot `POST /api/leads/typebot` | Salva em `launch_waitlist` com `source="typebot"` |
| 8.4 | Webhook com email duplicado | Retorna `{ ok: true, duplicate: true }`, não duplica |
| 8.5 | Webhook sem email | Retorna `{ ok: false, code: "missing_required_fields" }` |

---

## 9. Mobile e responsividade

| # | Ação | Resultado esperado |
|---|---|---|
| 9.1 | Landing em 375px (iPhone SE) | Hero, ticker e CTAs visíveis sem overflow horizontal |
| 9.2 | Modal em 375px | Modal ocupa full-width, inputs tocáveis |
| 9.3 | Formulário `/pre-acesso` em mobile | Campos não ultrapassam viewport |
| 9.4 | Menu mobile abre/fecha | Sem layout quebrado |
| 9.5 | Seção "O Problema" em mobile | Cards empilham em 1 coluna |
| 9.6 | Seção FAQ em mobile | Acordeão/lista funcional sem overflow |

---

## Critérios de bloqueio para lançamento (P0)

- [ ] Waitlist POST salva corretamente após SQL 75
- [ ] Admin consegue listar e agir sobre leads em `/admin/super/waitlist`
- [ ] Modal de conversa fecha e abre sem bug de estado
- [ ] Nenhuma rota pública retorna dados internos (service role, tokens, env)
- [ ] Header não duplica em `/planos` e `/pre-acesso`
- [ ] Build Vercel passa sem erro TypeScript

---

*Atualizar este documento com cada novo fluxo implementado.*
