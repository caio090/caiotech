# Storage & Drive — Estratégia da Lokat OS

## Status atual: Planejado (não implementado)

---

## Objetivo

Permitir que agências e clientes armazenem e acessem arquivos diretamente na Lokat OS:
arquivos de briefing, artes aprovadas, vídeos de produção, logos, documentos contratuais.

---

## Abordagem planejada

### Fase 1 — Supabase Storage (nativo, sem custo adicional)

Usar o Supabase Storage que já está disponível no projeto.

**Buckets previstos:**

| Bucket              | Acesso             | Uso                                       |
|---------------------|--------------------|-------------------------------------------|
| `rec-assets`        | Privado (signed URL) | Artes do REC OS, aprovações              |
| `client-files`      | Privado (signed URL) | Arquivos enviados por clientes           |
| `agency-brand`      | Privado              | Logos, paletas, identidade visual         |
| `brief-attachments` | Privado              | Attachments de briefings                 |
| `public-assets`     | Público              | Thumbnails, avatars, imagens de perfil   |

**RLS por bucket:**
- Acesso por `owner_id` ou `client_id` na tabela `file_metadata`
- Signed URLs com expiração (15 min para preview, 24h para download)
- Upload só via API server-side (não expõe service role)

**Tabela de metadados:**
```sql
CREATE TABLE public.file_metadata (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket      text NOT NULL,
  path        text NOT NULL,
  name        text NOT NULL,
  size        bigint,
  mime_type   text,
  owner_id    uuid REFERENCES auth.users(id),
  client_id   uuid REFERENCES public.clients(id),
  rec_item_id uuid NULL,  -- vincular a item do REC OS
  created_at  timestamptz DEFAULT now()
);
```

---

### Fase 2 — Google Drive (integração opcional)

Para clientes que já usam Google Drive, permitir vincular uma pasta.

**Abordagem:** OAuth2 Google Drive API v3 por conta do usuário (não service account).

**Não implementar antes de:**
- [ ] Fase 1 estável
- [ ] Supabase Storage validado em produção
- [ ] Pelo menos 5 clientes ativos usando upload

---

## O que NÃO fazer

- Não usar Google Drive como armazenamento principal (dependency externa desnecessária antes de validar)
- Não expor URLs diretas do Supabase Storage (usar signed URLs)
- Não implementar upload direto do browser sem validação server-side de tamanho e tipo
- Não bloquear o deploy por esta feature — Storage é roadmap, não blocante

---

## Próximos passos

1. Criar SQL de tabela `file_metadata`
2. Criar bucket `rec-assets` no Supabase Storage (via Dashboard)
3. Criar `/api/storage/upload` com validação de tipo e tamanho
4. Criar `/api/storage/signed-url` para acesso seguro
5. Integrar no REC OS — botão "Anexar arte aprovada"

---

## Estimativa de custo (Supabase Free tier)

- 1 GB de storage gratuito
- 2 GB/mês de transferência gratuita
- Suficiente para beta com < 20 clientes

---

*Criado: 2026-07-06. Status: Planejado — não implementar ainda.*
