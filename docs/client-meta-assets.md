# client_meta_assets — Ativos Meta por Cliente

## Propósito

Liga Páginas Facebook, contas Instagram Business e Ad Accounts a clientes específicos da agência.

Um mesmo usuário Meta pode gerenciar múltiplas páginas. Esta tabela registra qual página/conta pertence a qual cliente, permitindo:
- Mostrar o @instagram correto no perfil do cliente
- Puxar métricas específicas por cliente
- Saber qual Ad Account usar para anúncios de cada cliente

## Schema (SQL 37)

```sql
client_meta_assets (
  id                uuid PK
  client_id         uuid FK → clients(id)
  meta_connection_id uuid FK → meta_connections(id) (nullable)
  asset_type        text CHECK IN ('facebook_page', 'instagram_business', 'ad_account', 'business_manager')
  asset_id          text  -- ID na Graph API
  asset_name        text
  username          text
  picture_url       text
  is_primary        boolean DEFAULT false
  connected_by      uuid FK → auth.users(id)
  connected_at      timestamptz
  created_at / updated_at
  UNIQUE (client_id, asset_type, asset_id)
)
```

## Como usar

### Vincular um ativo a um cliente

```typescript
const { error } = await supabase
  .from("client_meta_assets")
  .upsert({
    client_id:          clientId,
    meta_connection_id: connectionId,
    asset_type:         "facebook_page",
    asset_id:           page.id,
    asset_name:         page.name,
    username:           null,
    picture_url:        page.picture_url,
    is_primary:         true,
    connected_by:       userId,
  }, { onConflict: "client_id,asset_type,asset_id" });
```

### Buscar ativos de um cliente

```typescript
const { data } = await supabase
  .from("client_meta_assets")
  .select("*")
  .eq("client_id", clientId)
  .order("is_primary", { ascending: false });
```

## Fluxo planejado

1. Usuário conecta a Meta no `/admin/conexoes` (OAuth)
2. Painel lista Páginas/Instagram encontradas via `/api/meta/accounts`
3. Usuário clica em "Vincular a cliente X" → insere em `client_meta_assets`
4. No perfil do cliente e no ContentOS, o ativo Meta aparece automaticamente

> **SQL 37 deve ser rodado no Supabase antes de usar esta tabela.**
