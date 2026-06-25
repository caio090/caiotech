# LOKAT OS — Estado do Projeto e Próximos Passos

**Atualizado:** 2026-06-25

---

## 1. Estado atual

- **Domínio:** www.lokat.com.br (produção ativa)
- **Hospedagem:** Vercel (auto-deploy via GitHub)
- **Repositório:** github.com/caio090/caiotech
- **Branch de produção:** `main`
- **Banco de dados:** Supabase (base real, dados reais)
- **Framework:** Next.js 16.2.9 (App Router)

---

## 2. Fluxo GitHub → Vercel → Domínio

```
Desenvolvimento local
    ↓ npm run build (validar)
    ↓ git commit + git push origin main
    ↓
GitHub (main)
    ↓ webhook automático
    ↓
Vercel (build + deploy)
    ↓
www.lokat.com.br
```

⚠️ **Atenção:** Atualmente tudo vai direto para `main` = produção.
Recomendado criar branch `dev` para testes antes de enviar para main.

---

## 3. Como testar localmente

```bash
# 1. Configurar variáveis de ambiente
cp .env.example .env.local  # ou criar manualmente
# Adicionar NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

# 2. Instalar dependências
npm install

# 3. Iniciar servidor de desenvolvimento
npm run dev

# 4. Acessar
http://localhost:3000
```

---

## 4. Como testar via preview (Vercel)

```bash
# 1. Criar branch de teste
git checkout -b test/nome-da-feature

# 2. Fazer commits normalmente
git add ...
git commit -m "feat: ..."

# 3. Push para o repositório
git push origin test/nome-da-feature

# 4. A Vercel gera automaticamente uma URL de preview
# Ex: https://caiotech-git-test-nome-da-feature.vercel.app

# 5. Testar na URL de preview

# 6. Aprovado? Merge para main
git checkout main
git merge test/nome-da-feature
git push origin main
```

---

## 5. Como publicar produção

```bash
# Checklist antes de publicar:
# ✅ npm run build → sem erros
# ✅ Testar login
# ✅ Testar cadastro
# ✅ Testar landing page
# ✅ Testar fluxo que foi alterado

git checkout main
git pull origin main
git merge <branch-testada>
git push origin main
# → Vercel faz deploy automático em 1-2 minutos
```

---

## 6. Variáveis de ambiente necessárias

| Variável | Onde usar | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend + Backend | ✅ Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend + Backend | ✅ Sim |
| `OPENAI_API_KEY` | Somente servidor | Para IA |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente servidor (webhooks) | Opcional |

**Onde adicionar na Vercel:**
Vercel Dashboard → Project → Settings → Environment Variables

---

## 7. Tabelas principais do Supabase

| Tabela | Função |
|---|---|
| `profiles` | Usuários do sistema (admin, cliente, social_media…) |
| `clients` | Clientes da agência |
| `content_items` | Conteúdos do ContentOS |
| `approvals` | Aprovações de conteúdo pelo cliente |
| `operational_tasks` | Tarefas do OperacionalOS |
| `notifications` | Notificações do sistema |
| `rec_projects` | Projetos do RecOS |
| `rec_storyboard_frames` | Frames/cenas do storyboard |
| `operational_attachments` | Anexos das tarefas |
| `campaigns` | Campanhas do ContentOS |
| `onboarding_profiles` | Dados do onboarding de cada cliente |

---

## 8. SQLs já executados em produção

| SQL | Descrição |
|---|---|
| 01 | Schema inicial |
| 02 | Criação de cliente no signup |
| 03 | Fix onboarding e client RLS |
| 04 | Content RLS para cliente |
| 05 | Admin equipe RLS |
| 06 | OperacionalOS v1 |
| 07 | Convites de equipe |
| 08 | Solicitações de acesso |
| 09 | Notificações admin e limpeza |
| 10 | Gestão de roles e contas |
| 11 | Fix fluxo cliente-ContentOS-operacional |
| 12 | Fix visibilidade tarefas e notificações |
| 13 | Fix visualização clientes reais |
| 14 | Fluxo aprovação-produção ContentOS |
| 15 | ComercialOS |
| 16 | Ciclo de produção ContentOS |
| 18 | Arquitetura e permissões ContentOS |
| 19 | Sugestões IA e Lokat Voice |
| 20 | Attachments e atividade de perfil |
| 21 | Attachments por formato |
| 22 | Upload universal de anexos |
| 23 | Formatos híbridos e histórico de tarefas |
| 24 | Trigger automático de produção pós-aprovação |
| 25 | RecOS storyboard audiovisual |
| 26 | Arquivos do cliente e media library RecOS |
| 27 | Fix trigger aprovação + índices |

---

## 9. SQLs pendentes (não rodados ainda)

| SQL | Descrição | Status |
|---|---|---|
| 28 | Auditoria de dados de teste | ⏳ Aguardando rodar |
| 29 | Fix notificações e roteamento | ⏳ Aguardando rodar |

**Para rodar:** Supabase Dashboard → SQL Editor → colar o conteúdo do arquivo

---

## 10. Fluxos prontos

- ✅ Landing page pública
- ✅ Login / cadastro
- ✅ Onboarding do cliente
- ✅ Dashboard admin
- ✅ ContentOS — criação de conteúdo
- ✅ ContentOS — envio para aprovação
- ✅ Link público de aprovação pelo cliente
- ✅ ContentOS — envio direto para produção
- ✅ OperacionalOS — kanban e tarefas
- ✅ RecOS — projetos audiovisuais
- ✅ Painel do cliente

---

## 11. Fluxos com pendências

- ⚠️ Notificações: trigger criado (SQL 29) mas não rodado
- ⚠️ IA: rotas criadas mas OPENAI_API_KEY precisa ser adicionada na Vercel
- ⚠️ Reset de senha: páginas criadas, configurar redirect URL no Supabase Auth

---

## 12. Configuração de reset de senha no Supabase

Para o fluxo "Esqueci minha senha" funcionar em produção:

1. Acesse Supabase Dashboard → Authentication → URL Configuration
2. Em "Redirect URLs" adicionar:
   - `https://www.lokat.com.br/redefinir-senha`
   - `http://localhost:3000/redefinir-senha` (para dev local)
3. Em "Site URL": `https://www.lokat.com.br`

---

## 13. Checklist para versão vendável

- [ ] Fluxo completo de onboarding testado
- [ ] ContentOS → Aprovação → Operacional funcionando com notificações
- [ ] Reset de senha configurado no Supabase
- [ ] IA integrada (adicionar OPENAI_API_KEY na Vercel)
- [ ] Página de planos com checkout real
- [ ] Webhook de pagamento configurado
- [ ] E-mail transacional configurado no Supabase

---

## 14. Cuidados com dados reais

- **Nunca rodar SQL destrutivo sem backup**
- **Nunca apagar auth.users** — use Supabase Auth Dashboard para gerenciar
- **Nunca apagar clients sem confirmação do cliente**
- Para limpar dados de teste: usar SQL 28 para auditoria primeiro

---

## 15. Como limpar dados de teste com segurança

1. Rodar SQL 28 (somente SELECT — auditoria)
2. Analisar resultado: quais registros são realmente de teste
3. Criar SQL 28b com DELETEs específicos por ID
4. Confirmar com o responsável antes de executar
5. Manter backup (export) antes de qualquer DELETE em massa

---

## 16. Fluxo de desenvolvimento recomendado

```
Pedido de melhoria/correção
    ↓
Criar branch: git checkout -b fix/nome-do-fix
    ↓
Desenvolver + testar local (npm run dev)
    ↓
npm run build → sem erros
    ↓
git push origin fix/nome-do-fix
    ↓
Verificar preview na Vercel
    ↓
Testar fluxos críticos no preview
    ↓
Merge para main → produção
```
