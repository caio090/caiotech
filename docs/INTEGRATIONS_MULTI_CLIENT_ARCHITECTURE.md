# Integrations — Multi-Client Architecture

Descreve o modelo de autorização, escopo por cliente e cache conforme implementado em
`src/lib/access-control.ts`, `src/lib/digital-menu/server.ts`,
`src/app/api/admin/clients/route.ts`, `src/app/api/olaclick/connect/route.ts`,
`src/app/api/olaclick/connections/route.ts` e
`src/app/api/olaclick/connections/[id]/route.ts`.

---

## 1. Escopo por Cliente (client_id)

Toda operação OlaClick é obrigatoriamente vinculada a um `client_id`:

- `GET /api/olaclick/orders` rejeita com 400 `missing_client_id` se o parâmetro estiver ausente.
- A busca de conexão (`getActiveDigitalMenuConnection`) filtra por `client_id` na tabela
  `olaclick_connections`; jamais consulta globalmente.
- O cache é chaveado por `olaclick:{clientId}:{start}:{end}` — nunca compartilhado entre clientes.
- A criação de conexão (`POST /api/olaclick/connect`) exige `client_id` no corpo e valida que o
  cliente existe e está ativo/onboarding antes de inserir.

**Proibido:** buscar `olaclick_connections` sem filtro `eq("client_id", clientId)`.

---

## 2. Hierarquia de Roles

Definida em `src/lib/access-control.ts`.

| Role | Home | Pode listar clientes | Pode criar/editar/excluir conexão OlaClick | Pode listar conexões OlaClick |
|---|---|---|---|---|
| `super_admin` | `/admin/plataforma` | Sim | Sim | Sim |
| `admin` | `/admin/dashboard` | Sim | Sim | Sim |
| `agency` | — | Não (não incluso em CLIENT\_MANAGER\_ROLES) | Sim | Sim |
| `operacional` | `/operacional/dashboard` | Não | Não | Sim |
| `social_media` | `/operacional/minhas-tarefas` | Não | Não | Não |
| `designer` | `/operacional/minhas-tarefas` | Não | Não | Não |
| `editor` | `/operacional/minhas-tarefas` | Não | Não | Não |
| `videomaker` | `/operacional/minhas-tarefas` | Não | Não | Não |
| `gestor_trafego` | `/operacional/minhas-tarefas` | Não | Não | Não |
| `comercial` / `sdr` / `closer` | `/operacional/comercial` | Não | Não | Não |
| `financeiro` | `/operacional/dashboard` | Não | Não | Não |
| `cliente` | `/client/home` | Não | Não | Não |
| `aluno` | `/academy/home` | Não | Não | Não |

**Sets de roles por recurso (valores extraídos do código):**

```ts
// Clientes: listar e criar
CLIENT_MANAGER_ROLES = new Set(["admin", "super_admin"])

// Conexões OlaClick: criar, editar, excluir
OLA_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"])

// Conexões OlaClick: listar
ALLOWED_ROLES (connections GET) = new Set(["admin", "super_admin", "agency", "operacional"])
```

A função `canAccessAdmin(role)` retorna `true` apenas para `admin` e `super_admin`.  
A função `canAccessPlatformCentral(role)` retorna `true` apenas para `super_admin`.

---

## 3. Regras de Unicidade de Conexão

A tabela `olaclick_connections` não tem restrição UNIQUE ao nível de API visível — múltiplas
linhas com o mesmo `client_id` são possíveis.

**Estratégia de resolução:**

`getActiveDigitalMenuConnection` em `src/lib/digital-menu/server.ts` usa:

```ts
.eq("client_id", clientId)
.in("status", ["connected", "active"])
.order("created_at", { ascending: false })
.limit(1)
.maybeSingle()
```

A conexão mais recente com status `connected` ou `active` é a que vence.

**RPC `admin_upsert_olaclick_connection`:** o nome sugere semântica de upsert (unicidade por
`client_id`). Quando a RPC está disponível, é o caminho preferencial. Quando ausente, o fallback
direto faz `INSERT` e pode criar duplicatas — aceitar isso como estado temporário e depender do
critério `order("created_at", desc).limit(1)` para resolução.

---

## 4. Arquitetura de Cache

Implementado em `src/app/api/olaclick/orders/route.ts`. Cache de instância Node.js — não
distribuído.

| Aspecto | Detalhe |
|---|---|
| Armazenamento | `globalThis.__olaclick_cache` — Map\<string, {data, timestamp}\> |
| Chave | `olaclick:{clientId}:{startDate}:{endDate}` |
| TTL | 5 minutos (300.000 ms) |
| Condição de escrita | Somente se `total_pedidos > 0` |
| Eviction | Entradas expiradas removidas a cada escrita |
| Bypass | Query param `force_refresh=1` pula leitura do cache (mas ainda escreve) |
| In-flight dedup | `globalThis.__olaclick_inflight` — Map\<string, Promise\> — evita múltiplas chamadas simultâneas para a mesma chave |
| Escopo | Local à instância. Perdido em cold start ou redeploy. Não compartilhado entre instâncias. |

---

## 5. O Que NÃO Fazer

### 5.1 Nunca usar `.maybeSingle()` sem `.order().limit(1)` em `olaclick_connections`

```ts
// ERRADO — falha com PGRST116 se houver mais de uma conexão
supabase.from("olaclick_connections").eq("client_id", id).maybeSingle()

// CORRETO
supabase.from("olaclick_connections")
  .eq("client_id", id)
  .in("status", ["connected", "active"])
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle()
```

### 5.2 Nunca retornar `access_token` em respostas de API

O campo `access_token` é lido internamente pela rota e usado apenas para chamar o provider.
Nenhum endpoint retorna esse campo. O campo `token_last_four` (últimos 4 caracteres) é o
substituto seguro para display.

### 5.3 Nunca buscar conexões globalmente (sem client_id)

```ts
// ERRADO — ignora escopo por cliente
supabase.from("olaclick_connections").eq("status", "connected").limit(1)

// CORRETO — sempre filtrar por client_id
getActiveDigitalMenuConnection(supabase, clientId)
```

### 5.4 Nunca assumir que o cache sobrevive ao redeploy

O cache `globalThis.__olaclick_cache` é memória de processo. Não use para dados que precisam
persistir entre deploys ou para sincronização entre instâncias.

### 5.5 Nunca criar conexão sem verificar existência do cliente

O endpoint `POST /api/olaclick/connect` valida status do cliente antes do insert. Em qualquer
código alternativo, reproduzir essa verificação: cliente deve existir, não estar em `deleted_at`,
não estar em `archived_at`, e estar com status em `CLIENT_VISIBLE_STATUSES`.

---

## 6. Fluxo de Autorização para Criação de Cliente

`POST /api/admin/clients` usa dois caminhos em cascata:

1. **RPC `admin_create_client` (SECURITY DEFINER):** Bypass de RLS, valida role internamente.
   Disponível após rodar `docs/supabase/51-admin-create-client-bypass.sql`.
2. **Service role (fallback):** Usa `SUPABASE_SERVICE_ROLE_KEY`. O campo `agency_id` é preenchido
   com `profile.id` para roles que não são `super_admin`.

`super_admin` não preenche `agency_id` (pertence à plataforma central).  
`admin` preenche `agency_id = profile.id` (cliente pertence à agência).
