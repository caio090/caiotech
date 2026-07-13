# NAVIGATION V1 AUDIT — atualizado 2026-07-13

## Decisão: home do super_admin

| Antes | Depois | Motivo |
|-------|--------|--------|
| `/admin/plataforma` | `/admin/dashboard` | Plataforma duplicava Dashboard + Clientes + Contas sem valor próprio |

### Rota legada `/admin/plataforma`
- Mantida para compatibilidade de link (bookmarks, emails, documentação antiga).
- Executa `redirect("/admin/super/accounts")` — sem busca de dados, sem renderização.
- **Não aparece na sidebar.** Nunca apareceu.

### Home por perfil (ROLE_HOME em src/lib/access-control.ts)

| Role | Destino |
|------|---------|
| super_admin | /admin/dashboard |
| admin | /admin/dashboard |
| cliente | /client/home |
| operacional | /operacional/dashboard |
| comercial / sdr / closer | /operacional/comercial |
| social_media / designer / editor / videomaker / gestor_trafego | /operacional/minhas-tarefas |
| financeiro | /operacional/dashboard |
| aluno | /academy/home |

# NAVIGATION V1 AUDIT — 2026-07-12

Auditoria completa dos itens da sidebar administrativa após sprint de restauração.

| Item | Rota | Tipo de dado | Estado | Acesso atual | Decisão | Justificativa |
|------|------|-------------|--------|-------------|---------|---------------|
| Início | /admin/inicio | Real | OK | Sidebar admin | Manter | Ponto de entrada principal |
| Dashboard | /admin/dashboard | Real | OK | Sidebar admin | Manter | KPIs e métricas agregadas |
| REC OS | /admin/contentos | Real | OK | Sidebar admin | Manter | Conteúdo, campanhas, calendário editorial |
| Audiovisual | /admin/recos | Real | Restaurado | Sidebar admin | Restaurar | Módulo audiovisual completo — foi removido sem substituto |
| Operacional | /admin/operacional | Real | OK | Sidebar admin | Manter | Kanban de tarefas operacionais |
| Clientes | /admin/clientes | Real | OK | Sidebar admin | Manter | CRM e gestão de clientes |
| Equipe | /admin/equipe | Real | Restaurado | Sidebar admin | Restaurar | Perfis e funções da equipe — foi removido sem substituto |
| Diagnósticos | /admin/diagnosticos | Real | Restaurado | Sidebar admin | Restaurar | Diagnóstico digital e comercial por cliente — foi removido sem substituto |
| Dados & Insights | /admin/relatorios | Real | OK | Sidebar admin | Manter | Relatórios de conteúdo e faturamento |
| Financeiro | /admin/financeiro | Real | OK | Sidebar admin | Manter | Gestão financeira |
| Billing & Planos | /admin/super/billing | Real | OK | Sidebar admin | Manter | Planos e cobranças |
| Contas | /admin/super/accounts | Real | OK | Sidebar admin | Manter | Contas de usuário |
| Integrações | /admin/conexoes | Real | OK | Sidebar admin | Manter | Central de conexões por provedor |
| Configurações | /admin/configuracoes | Real | OK | Sidebar admin | Manter | Configurações do sistema |
| Projetos | /admin/projetos | Mock (mockProjects) | Legado | Não na sidebar | Não restaurar | Dados fictícios — sem valor operacional na V1 |
| Fontes de Dados | /admin/fontes-dados | Real | OK | Via /admin/relatorios | Não restaurar na sidebar | Acessível por Dados & Insights em até dois cliques |
| WhatsApp | /admin/whatsapp (se existir) | — | Legado | Via /admin/conexoes | Não restaurar na sidebar | Fluxo futuro parte de Integrações |
| Biblioteca Audiovisual | /admin/rec/videos | Real | OK | Via /admin/recos (nav local) | Não na sidebar principal | Acessível pelo módulo Audiovisual |

## Módulo Audiovisual — Navegação Interna

Dentro do módulo Audiovisual há navegação local entre:
- **Projetos** → /admin/recos (lista de projetos audiovisuais)
- **Biblioteca de vídeos** → /admin/rec/videos (portfólio, upload, casos)

## Regra de Remoção

> Nenhum item funcional pode ser removido da sidebar administrativa sem:
> 1. Identificar a rota substituta
> 2. Garantir acesso em até dois cliques
> 3. Registrar o destino aqui e em DECISIONS.md
> 4. Validar que a página antiga não contém função exclusiva
> 5. Realizar QA de navegação
