# LOKAT OS — Plano de Integração Meta / Instagram

**Status:** Base criada — OAuth pendente de app Meta aprovado  
**Criado em:** 2026-06-25  
**Referência:** `docs/24-future-intelligence-and-integrations.md` (arquitetura conceitual)

---

## 1. Objetivo da Integração

Conectar contas Meta (Instagram, Facebook Pages, Meta Ads) por organização e por cliente dentro da LOKAT OS, de forma segura e isolada, para futuramente:

- Exibir insights de posts (alcance, engajamento, impressões)
- Monitorar performance de campanhas (Meta Ads)
- Identificar conteúdos de alta performance para reforço pago
- Alimentar o Agente de KPIs com dados reais
- Sugerir ações no ContentOS baseadas em dados reais de desempenho

**Esta etapa:** estrutura de banco, API routes server-side, tela de status e preparação para OAuth.  
**Próxima etapa:** App Meta aprovado → OAuth real → leitura de Insights.

---

## 2. Etapas do MVP

### Etapa 1 — Base (esta entrega)
- [x] Tabela `meta_connections` com RLS
- [x] API routes: status, connect (placeholder), callback (placeholder), disconnect, test
- [x] UI de status em ContentOS > Configurações
- [x] Variáveis de ambiente documentadas
- [x] Documentação de segurança

### Etapa 2 — App Meta + OAuth real
- [ ] Criar App no Meta Developers (facebook.com/developers)
- [ ] Configurar produto "Facebook Login for Business"
- [ ] Configurar produto "Instagram Graph API"
- [ ] Definir scopes necessários por funcionalidade
- [ ] Ativar `/api/meta/connect` com redirect real para Meta OAuth
- [ ] Ativar `/api/meta/callback` com troca de code por token

### Etapa 3 — Leitura de Insights
- [ ] Endpoint `/api/meta/insights/[clientId]` — posts, alcance, engajamento
- [ ] Endpoint `/api/meta/ads/[clientId]` — campanhas, ROAS, CTR
- [ ] Job periódico de sincronização (Supabase Edge Function ou cron)
- [ ] Exibição de dados no ContentOS e dashboard do cliente

### Etapa 4 — Gestão de Múltiplos Clientes
- [ ] Fluxo de autorização por cliente (cliente autoriza seus próprios ativos)
- [ ] Painel ADM mostrando status de todas as conexões da organização
- [ ] Alerta de token expirado com solicitação de reconexão

---

## 3. Variáveis de Ambiente Necessárias

| Variável | Descrição | Onde configurar |
|---|---|---|
| `META_APP_ID` | ID do app no Meta Developers | Vercel + `.env.local` |
| `META_APP_SECRET` | Secret do app — **NUNCA expor no frontend** | Vercel (apenas servidor) |
| `META_REDIRECT_URI` | URL de callback após OAuth | Vercel + Meta App Settings |
| `META_WEBHOOK_VERIFY_TOKEN` | Token de verificação de webhooks | Vercel |
| `META_API_VERSION` | Versão da Graph API (ex: `v21.0`) | Vercel + `.env.local` |

**Regra obrigatória:** nenhuma dessas variáveis pode ser prefixada com `NEXT_PUBLIC_`.

### Exemplo de valor para `META_REDIRECT_URI`
```
# Desenvolvimento
META_REDIRECT_URI=http://localhost:3000/api/meta/callback

# Produção (Vercel)
META_REDIRECT_URI=https://seudominio.com.br/api/meta/callback
```

---

## 4. Diferença: Instagram Insights vs Meta Ads

| | Instagram Insights | Meta Ads |
|---|---|---|
| **O que lê** | Posts, stories, reels, perfil | Campanhas, conjuntos, anúncios |
| **Escopo necessário** | `instagram_basic`, `pages_read_engagement` | `ads_read`, `business_management` |
| **Token necessário** | Page Access Token | User Access Token com permissão de Ads |
| **Endpoint** | `GET /me/media` | `GET /act_{ad_account_id}/campaigns` |
| **Caso de uso LOKAT OS** | Qual post performou melhor esta semana | Qual campanha tem ROAS abaixo do mínimo |
| **Complexidade** | Baixa | Média |
| **Prioridade** | Alta (MVP) | Média (ciclo seguinte) |

---

## 5. Permissões Futuras por Funcionalidade

```
Insights de posts e perfil:
  instagram_basic
  instagram_manage_insights
  pages_read_engagement

Publicação de conteúdo (futuro):
  instagram_content_publish
  pages_manage_posts

Leitura de leads de formulário Meta:
  leads_retrieval
  pages_manage_ads

Meta Ads:
  ads_read
  business_management
  ads_management (apenas se for criar/editar anúncios)

WhatsApp Business (longo prazo):
  whatsapp_business_messaging
  whatsapp_business_management
```

---

## 6. Riscos de Segurança

### Críticos
| Risco | Mitigação |
|---|---|
| Token exposto no frontend | Tokens ficam em `meta_connections.access_token_encrypted` — nunca retornados por API |
| Token global para múltiplos clientes | Uma row por conexão, isolada por `organization_id` |
| Secret no frontend | `META_APP_SECRET` nunca em `NEXT_PUBLIC_*`, apenas em routes server-side |
| Vazamento entre organizações | RLS por `organization_id` + verificação na route |

### Médios
| Risco | Mitigação |
|---|---|
| Token expirado silencioso | Campo `token_expires_at` + verificação periódica + alerta de UI |
| Revogação de permissão pelo usuário | Webhook de deauthorize + status `revoked` |
| CSRF no callback OAuth | Parâmetro `state` com valor aleatório vinculado à sessão |

---

## 7. Checklist de Testes (quando OAuth estiver ativo)

- [ ] Fluxo completo: clicar "Conectar Meta" → Meta Login → retorno ao callback
- [ ] Token salvo sem aparecer em nenhum log ou response de API
- [ ] Status correto refletido na UI após conexão
- [ ] Organização A não consegue ver conexão da Organização B
- [ ] Cliente não consegue ver token — apenas status
- [ ] Desconectar marca status como `disconnected` sem apagar o registro
- [ ] Token expirado exibe alerta de reconexão
- [ ] Endpoint `/api/meta/test` retorna `configured: true` sem revelar secret

---

## 8. Estrutura de Arquivos Criados Nesta Etapa

```
docs/
  25-meta-integration-plan.md         ← este arquivo
docs/supabase/
  35-meta-connections.sql             ← tabela + RLS + índices

src/app/api/meta/
  status/route.ts                     ← GET — status da conexão por org
  connect/route.ts                    ← GET — inicia OAuth (placeholder)
  callback/route.ts                   ← GET — recebe code (placeholder)
  disconnect/route.ts                 ← POST — desconecta
  test/route.ts                       ← GET — testa variáveis de ambiente

src/app/contentos/configuracoes/
  page.tsx                            ← adiciona bloco Meta/Instagram
```

---

## 9. Próximos Passos para Ativar OAuth Real

1. Acessar [Meta for Developers](https://developers.facebook.com/apps/)
2. Criar novo app → Tipo: **Business**
3. Adicionar produto **Facebook Login for Business**
4. Adicionar produto **Instagram Graph API**
5. Em "Configurações > Básico": copiar `App ID` e `App Secret`
6. Em "Facebook Login > Configurações": adicionar `META_REDIRECT_URI` em "URIs de redirecionamento OAuth válidos"
7. Solicitar permissões avançadas se necessário (revisão da Meta para permissões de Insights)
8. Configurar variáveis na Vercel
9. Ativar as routes de connect/callback com lógica OAuth real

---

*Documento de referência — atualizar conforme OAuth for implementado.*
