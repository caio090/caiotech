# Tipos de Conta — LOKAT OS

## Visão geral

A LOKAT OS suporta quatro perfis de uso. O campo `account_type` na tabela `profiles`
(e indiretamente em `meta_connections`) distingue o que cada usuário pode ver e fazer.

---

## 1. LOKAT Central (`account_type: lokat`)

A própria equipe LOKAT usando o sistema como agência central.

**Pode:**
- Ver e gerenciar todos os clientes da carteira LOKAT
- Conectar a Meta Business da LOKAT
- Mapear páginas e perfis da BM para clientes específicos (Duh Lanches, O Pedreirão, etc.)
- Acessar FinanceOS com cobrança de clientes
- Ver equipe completa, métricas globais e relatórios consolidados

**Não pode:**
- Ver dados de outras agências contratantes

---

## 2. Agência Contratante (`account_type: agencia`)

Uma agência de marketing que assina a LOKAT OS para gerenciar os próprios clientes.

**Pode:**
- Conectar a própria Meta Business
- Mapear páginas/perfis da BM dela para os clientes dela
- Usar ContentOS, RecOS, GrowthOS, FinanceOS para clientes dela
- Gerenciar equipe própria (team members)

**Não pode:**
- Ver dados da LOKAT central
- Ver dados de outras agências contratantes
- Qualquer dado de clientes de outras agências

**Isolamento:** garantido por `organization_id` (quando implementado) ou por `connected_by`
no schema atual.

---

## 3. Empresa / Autônomo (`account_type: empresa` ou `autonomo`)

Pequena empresa ou profissional autônomo que usa a LOKAT OS para o próprio negócio.

**Pode:**
- ContentOS para planejamento de conteúdo próprio
- RecOS para gravações e produções
- Diagnóstico de marca com IA
- Calendário editorial
- Relatórios de desempenho
- Conectar a própria conta Meta para insights e (futuramente) publicação

**Diferença chave:**
Não precisa de módulo de cobrança de clientes. O FinanceOS pode ser simplificado
ou omitido conforme o plano contratado.

---

## 4. Cliente Atendido (`account_type: cliente_atendido`)

O cliente final que recebe o serviço da agência ou da LOKAT.

**Pode:**
- Ver aprovações de conteúdo (portal `/client`)
- Ver calendário de publicações
- Ver relatórios permitidos pela agência
- Aprovar conteúdo por link público (sem login obrigatório)

**Não pode:**
- Ver tokens Meta ou configurações internas
- Ver dados de outros clientes
- Gerenciar integrações

**Visibilidade Meta:** o cliente atendido vê apenas "Meta conectada ✓" ou "Meta não conectada"
quando a agência vinculou a conta dele. Nunca vê o `access_token`.

---

## Isolamento de dados

| Nível | Mecanismo atual | Mecanismo futuro |
|---|---|---|
| Por usuário | `connected_by = auth.uid()` | + `organization_id` |
| Por cliente | `client_id` | + RLS por org |
| Por agência | `connected_by` transitivo | `organization_id` com RLS |
| Admin global | `profiles.role = 'admin'` | Igual |

O campo `organization_id` na tabela `meta_connections` (e em outras) está documentado como
**pendência futura** — será adicionado quando a tabela `public.organizations` for criada.

---

## Mapeamento Meta por cliente (roadmap)

Após a agência conectar a Meta Business, o fluxo planejado é:

1. LOKAT OS chama `/me/accounts` para listar Páginas do Facebook
2. Para cada Página, chama `/page_id?fields=instagram_business_account` para obter a conta IG
3. Chama `/act_<ad_account_id>/adaccounts` para listar contas de anúncio da BM
4. O ADM associa cada Página/IG a um `client_id` no painel
5. A tabela `meta_connections` salva `page_id`, `instagram_business_account_id`, `ad_account_id` e `client_id`
6. O painel do cliente mostra apenas os dados vinculados ao `client_id` dele

**Bloqueador atual:** `instagram_manage_insights` e `business_management` exigem
Meta App Review para funcionar em produção fora do time de desenvolvimento.
