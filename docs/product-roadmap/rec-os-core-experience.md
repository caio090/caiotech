# REC OS — Core Experience & Social Intelligence

Prompt 13. Documento arquitetural curto e canônico — existe para impedir nova divergência conceitual entre Criar, Studio e EditorOS. Não é um guia de uso, é um mapa de fronteiras.

## Mapa de produto

```
REC OS (/admin/contentos)
├── Visão Geral      (/admin/contentos)
├── Radar            (/admin/contentos/radar)
├── Criar            (/admin/contentos/criar)        -- ORQUESTRAÇÃO
├── Studio           (/admin/contentos/visual)        -- PRODUÇÃO VISUAL (Prompt 13: agora na navegação)
├── Produção         (/admin/contentos/producao)
├── Aprovações       (/admin/contentos/aprovacoes)
├── Roadmap          (/admin/contentos/roadmap)
├── Mapa do Cliente  (/admin/contentos/mapa-cliente)
├── Calendário       (/admin/contentos/calendario)    -- DISTRIBUIÇÃO
├── Resultados       (/admin/contentos/resultados)     -- FEEDBACK
└── Conexões         (/admin/contentos/conexoes)
EditorOS (/admin/contentos/editor-os) -- EDIÇÃO E ACABAMENTO, fora do REC OS subnav
```

`Publicação` não é uma rota dedicada hoje: `/admin/contentos/distribuicao` redireciona para `campanhas?tab=trafego` (confirmado por auditoria, Prompt 13). Não criado neste sprint — fora do escopo (nenhuma rota nova foi adicionada; só o link de Studio na navegação já existente).

## Criar ≠ Studio ≠ EditorOS

| | Papel | Cuida de |
|---|---|---|
| **Criar** | Workflow | Objetivo, briefing, copy, campanha, status, aprovação, publicação |
| **Studio** | Motor/workspace visual | Direção visual, peça, série, Feed Context, render, regenerate |
| **EditorOS** | Edição/finalização | Ajuste manual, composição, acabamento, versão final |

Antes do Prompt 13: o step "Visual" do Criar tinha um card "Gerar com IA" desabilitado (nunca implementado) enquanto `/admin/contentos/visual` já era um Studio real e funcional, mas inacessível pela navegação — duas superfícies divergentes descrevendo a mesma etapa. Corrigido: o card agora abre o Studio real via `StudioLaunchContext` (`src/lib/rec-os/studio/launch-context.ts`), nunca reimplementa o formulário.

## StudioLaunchContext (Criar → Studio)

Mesma regra já aplicada ao handoff Criar → EditorOS: a URL carrega só IDs/referências canônicas (`client`, `content_id`, `campaign_id`, `social_profile_id`, `source_format`, `return_to`) — nunca o conteúdo do briefing. O servidor (`StudioPage`) resolve os dados reais a partir do `clientId`/`contentId`.

Volta (Studio → Criar): reaproveita o MESMO mecanismo de sessionStorage já usado pelo upload manual e pelo handoff Criar → EditorOS (`rec_os_visual_import_v1_${clientId}_${contentId}`, ver `src/lib/rec-os-workflow/visual-import-session.ts`) — "USAR NO CONTEÚDO" grava a peça gerada nesse formato e a Criar flow já sabe ler.

## Studio → EditorOS

Mesmo adaptador central já existente (`src/lib/rec-os-workflow/editor-handoff.ts`), nunca um segundo canvas. O Studio escreve a imagem na sessão (mesmo mecanismo acima) e navega para `/admin/contentos/editor-os` com o handoff serializado (`assetSource: "geracao_ia"`).

## Social Intelligence (Fase 09-19)

- **Social Profile Context** (`src/lib/rec-os/social-profile/resolve.ts`): NÃO é uma tabela nova. Projeta `client_meta_assets`/`meta_connections` (já em produção) no contrato canônico `SocialProfileContext` — nunca duplica token. Sem Instagram conectado, devolve `status: "not_connected"` — REC OS continua utilizável.
- **Feed DNA** (`src/lib/rec-os/social-profile/feed-dna.ts`): padrão/ritmo do feed ao longo do tempo. Hierarquia: Company DNA (`onboarding_profiles`) → Creative DNA (subconjunto usado por `buildStudioCreativeBusinessContext`) → Feed DNA (novo). Manual override sempre vence sugestão de IA (`user_override: true` é permanente até o próprio usuário mudar). Tabela `feed_dna_profiles` está desenhada (`docs/supabase/92-feed-dna-and-creative-series.sql`) mas **não executada** — ver AÇÕES MANUAIS/WEB no relatório do Prompt 13.
- **Canonical Creative Context** (`src/lib/rec-os/social-profile/canonical-creative-context.ts`): resolver único que compõe Company DNA + Social Profile + Feed DNA dinamicamente a cada chamada — nunca persiste um snapshot. Strategic Living DNA (`business-strategy/*`) e Campaign/Recent/Planned/Slot entram como `null` explícito nesta sprint (não auditados/wired ainda — débito documentado, não fingido).
- **Feed Temporal Context** (`src/lib/rec-os/social-profile/feed-timeline.ts`): published/planned sempre vazios com `limitation` explícita ("SIMULAÇÃO DO FEED") até existir um serviço real de listagem de mídia do Instagram (não existe hoje — só insights agregados). `inCreation` vem da própria sessão do Studio.

## Série Visual (Fase 20-24)

REGRA ABSOLUTA: N peças = N imagens/arquivos independentes, nunca um mosaico. Orquestração sequencial (concorrência 1, `src/lib/rec-os/studio/series/series-orchestrator.ts`, puro e testado) chama o MESMO endpoint `/api/studio/images/generate` uma vez por item — nunca um endpoint novo tentando gerar N imagens num único request de 60s. Persistência é só de sessão (React state) nesta sprint — `creative_series`/`creative_series_items` desenhadas, não executadas (mesmo motivo do Feed DNA).

## Background Guard (Fase 26-28)

`src/lib/rec-os/studio/image/background-guard.ts` — política "sem texto/logo/marca d'água" anexada a TODO `generationPrompt` antes do provider (Defesa 1, sempre ativa). Defesa 2 (validação automatizada por visão) não implementada — custaria uma segunda chamada cara dentro do orçamento de 60s; hook arquitetural documentado (`BACKGROUND_GUARD_STATUS = "prevention_only"`), nunca fingido como já pronto.

## Persistência (Fase 25)

Studio continua gerando efemeramente nesta sprint (sem insert em `client_visual_assets`/`ai_generation_jobs`, tabelas já existentes no schema mas não wired — confirmado por auditoria). Wiring de persistência real fica para um fast-follow, depois que a migration SQL 92 for aplicada — nunca inventado aqui sem a tabela existir de fato.
