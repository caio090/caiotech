# Checklist Manual — Supabase V1

Execute os SQLs na ordem abaixo pelo **SQL Editor do Supabase** (nunca automaticamente).
Não use DROP, TRUNCATE ou DELETE em dados reais.

---

## Ordem de execução

### 1. SQL 37 — client_meta_assets (pré-requisito de Insights por cliente)

**Arquivo:** `docs/supabase/37-client-meta-assets.sql` *(se existir)*  
**Libera:**
- Vincular página Facebook/Instagram a um cliente específico
- ContentOS Insights mostra "Meta conectada a este cliente"
- `/admin/contentos/home` exibe card Meta por cliente

**Validar após rodar:**
```sql
SELECT * FROM client_meta_assets LIMIT 5;
```

**Rollback lógico:** `DROP TABLE IF EXISTS client_meta_assets;` — só se não houver dados.

---

### 2. SQL 39 — olaclick_connections

**Arquivo:** `docs/supabase/39-olaclick-connections.sql`  
**Libera:**
- Tabela `olaclick_connections` para vincular token OlaClick por cliente
- ContentOS home exibe badge "Cardápio Digital" quando cliente tem OlaClick conectado
- APIs `/api/olaclick/*` começam a retornar dados reais

**Validar após rodar:**
```sql
SELECT * FROM olaclick_connections LIMIT 5;
```

**Rollback lógico:** `DROP TABLE IF EXISTS olaclick_connections;`

---

### 3. SQL 40 — PNG Vidigal · créditos de IA

**Arquivo:** `docs/supabase/40-png-vidigal-assets-and-ai-credits.sql`  
**Libera:**
- Tabela `ai_credit_wallet` — carteira de créditos por cliente
- Tabela `ai_credit_ledger` — histórico de uso
- Tabela `ai_generation_jobs` — jobs de geração de imagem
- Tabela `visual_assets` — biblioteca de ativos visuais por cliente
- PNG Vidigal deixa de mostrar "Estrutura pronta. Configure IA e créditos."

**Atenção:** Este SQL usa helper functions (`is_admin_user()`, `is_operational_staff()`).
Certifique-se de que esses helpers existem ou rodam junto.

**Validar após rodar:**
```sql
SELECT * FROM ai_credit_wallet LIMIT 5;
SELECT * FROM ai_generation_jobs LIMIT 5;
```

**Rollback lógico:**
```sql
DROP TABLE IF EXISTS ai_generation_jobs;
DROP TABLE IF EXISTS ai_credit_ledger;
DROP TABLE IF EXISTS ai_credit_wallet;
DROP TABLE IF EXISTS visual_assets;
```

---

### 4. SQL 41 — account_type e cleanup de clientes

**Arquivo:** `docs/supabase/41-platform-account-types-and-cleanup.sql`  
**Libera:**
- Coluna `account_type` na tabela `clients` (agency, direct_business, freelancer, internal)
- Colunas `deleted_at`, `archived_at` para soft delete consistente
- Coluna `parent_agency_id` para estrutura de subagências
- Segmentação avançada em `/admin/plataforma`

**Validar após rodar:**
```sql
SELECT id, company_name, account_type, deleted_at, archived_at FROM clients LIMIT 10;
```

**Rollback lógico:** As colunas podem ser removidas com `ALTER TABLE clients DROP COLUMN IF EXISTS ...`.

---

### 5. SQL 41b — atualizar v_real_clients com filtro deleted_at

**Inline no SQL Editor (não há arquivo separado):**
```sql
-- Recriar a view v_real_clients com filtro de deleted_at
CREATE OR REPLACE VIEW v_real_clients AS
SELECT c.*
FROM clients c
WHERE c.status NOT IN ('archived', 'deleted', 'canceled')
  AND c.deleted_at IS NULL
  AND c.responsible_name NOT ILIKE '%test%'
  AND c.responsible_name NOT ILIKE '%demo%'
  AND c.email NOT ILIKE '%operacional%'
  AND c.email NOT ILIKE '%admin%';
```

**Atenção:** Ajuste os filtros conforme a convenção real de e-mails do sistema.

**Valida após rodar:**
```sql
SELECT id, company_name, status FROM v_real_clients LIMIT 10;
```

---

### 6. Definir super_admin manualmente

**No SQL Editor do Supabase:**
```sql
-- Substitua o e-mail pelo e-mail real do dono da plataforma
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'EMAIL_DO_DONO_AQUI';
```

**Validar:**
```sql
SELECT id, email, role FROM profiles WHERE role = 'super_admin';
```

**Efeito:** Libera acesso ao `/admin/plataforma` (CRM Central).

---

## Resumo de estado

| SQL       | Status       | Bloqueia sem ele?              |
|-----------|-------------|-------------------------------|
| SQL 37    | Pendente    | ContentOS Insights por cliente |
| SQL 39    | Pendente    | OlaClick por cliente           |
| SQL 40    | Pendente    | PNG Vidigal · Créditos IA      |
| SQL 41    | Pendente    | Segmentação avançada Plataforma|
| SQL 41b   | Pendente    | Filtro de clientes deletados   |
| super_admin | Pendente  | Acesso ao /admin/plataforma    |

O código tem fallback seguro para todos os itens acima.
**O build e deploy funcionam sem esses SQLs rodarem.**
