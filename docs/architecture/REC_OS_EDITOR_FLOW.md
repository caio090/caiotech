# REC OS — Editor Flow

**Data:** 2026-07-13

---

## Fluxo Principal

```
REC OS (admin/contentos/selecionar-cliente)
  │
  ▼
Selecionar Cliente
  │  server-side: validar client_id + role
  ▼
REC OS Home (admin/contentos/home)
  │
  ├─► Campanhas
  ├─► Calendário
  ├─► Roteiros
  ├─► Briefings
  ├─► Produção
  ├─► Aprovações
  ├─► Agendamento (Social Scheduler — disabled)
  └─► EditorOS ──────────────────────────────────►
                                                  │
                                       admin/contentos/editor-os
                                                  │
                                        Parâmetros validados:
                                        - client_id (server)
                                        - campaign_id (opcional)
                                        - content_id (opcional)
                                        - briefing_id (opcional)
                                                  │
                                        Carregar contexto de marca:
                                        - clients.company_name
                                        - clients.segment
                                        - onboarding_profiles.brand_name
                                        - onboarding_profiles.social_channels
                                                  │
                                        Selecionar formato:
                                        Feed | Story | Carrossel |
                                        Banner | Anúncio | Thumbnail |
                                        Outdoor | Apresentação
                                                  │
                                        Canvas (provider em avaliação)
                                        Estado: "testing" / "blocked_license"
                                                  │
                                        ┌─────────┴──────────┐
                                        ▼                    ▼
                                   Salvar rascunho    Criar versão
                                   (mock)             (mock)
                                        │
                                        ▼
                                   Retornar ao REC OS
```

---

## Validações de Segurança

1. **Auth:** `supabase.auth.getUser()` — server-side
2. **Role:** deve ser `super_admin` (feature flag `editor_os`)
3. **Feature flag:** `getFeatureFlag("editor_os", { role })`
4. **client_id:** buscado no banco; não confiado do query param diretamente
5. **Isolamento:** cliente A não acessa dados de cliente B

---

## Navegação Interna do REC OS

A sidebar principal não recebe novos itens. A navegação dos submódulos do REC OS é contextual (dentro da área `/admin/contentos/*`):

```
Tabs internas (não sidebar):
┌──────────────────────────────────────────────────────────┐
│ Visão geral │ Campanhas │ Calendário │ Estratégia │ ...  │
│ Roteiros │ Briefings │ EditorOS │ Produção │ Aprovações  │
│ Agendamento │ Publicações │ Métricas │ Arquivos           │
└──────────────────────────────────────────────────────────┘
```

---

## Contexto de Marca no EditorOS

Campos carregados (quando disponíveis):

| Campo | Fonte | Status |
|---|---|---|
| Nome da empresa | `clients.company_name` | Sempre disponível |
| Segmento | `clients.segment` | Sempre disponível |
| Nome da marca | `onboarding_profiles.brand_name` | Se onboarding completo |
| Canais sociais | `onboarding_profiles.social_channels` | Se onboarding completo |
| Logo | Storage (futuro) | V2 |
| Cores | `onboarding_profiles` (campos de estilo) | V2 |
| Fontes | `onboarding_profiles` (campos de estilo) | V2 |

---

## Formatos Suportados

| ID | Label | Dimensões | Ratio |
|---|---|---|---|
| `feed_square` | Feed | 1080×1080 | 1:1 |
| `story_vertical` | Story | 1080×1920 | 9:16 |
| `carousel` | Carrossel | 1080×1350 | 4:5 |
| `banner` | Banner | 1200×628 | 1.91:1 |
| `ad` | Anúncio | 1200×628 | 1.91:1 |
| `thumbnail` | Thumbnail | 1280×720 | 16:9 |
| `outdoor` | Outdoor | 3000×2000 | 3:2 |
| `presentation` | Apresentação | 1920×1080 | 16:9 |

---

## Estado Atual (Pós-Sprint V2.1)

- ✅ Rota `admin/contentos/editor-os` criada
- ✅ Validação server-side de client_id
- ✅ Contexto de marca carregado do banco
- ✅ Seletor de formato visual
- ✅ Canvas placeholder com estado "em avaliação"
- ✅ Feature flag: apenas `super_admin`
- ❌ Motor de canvas real — bloqueado (pendente licença)
- ❌ Salvamento no banco — bloqueado (SQL 87 não executado)
- ❌ Exportação — bloqueado (motor não configurado)
