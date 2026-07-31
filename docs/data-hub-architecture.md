# Data Hub — `src/lib/data-hub/`

Camada que recebe informação de módulos internos, arquivos, planilhas, documentos e integrações, e a envelopa com proveniência, confiança e qualidade antes de qualquer módulo consumir. **Não é um banco paralelo** — nenhum tipo aqui implica persistência própria nesta sprint.

## Estrutura

- `types.ts` — `DataSource`, `DataSourceType`, `DataCapability`, `DataProvenance`, `DataConfidence`, `DataQualityStatus`, `DataQualityIssue`, `DataRecordEnvelope<T>`, `DataImportBatch`, `DataFieldMapping`, `ModuleDataContract`, `DataHubEvent`.
- `sources.ts` — fontes conhecidas hoje (`DATA_SOURCES`). Registrar uma fonte aqui não implica conexão real.
- `capabilities.ts` — o que cada `DataSourceType` suporta (`resolveDataCapabilities`).
- `provenance.ts` — `buildDataProvenance()`, a única função que constrói `DataProvenance`. Proveniência nunca é autorização e nunca guarda segredo/payload completo.
- `confidence.ts` — ranking de `DataConfidence` e `pickMostConfident()` para resolver divergência entre fontes.
- `quality.ts` — `resolveAggregateQuality()`, regra determinística sobre uma lista de `DataQualityIssue`.
- `normalizers.ts` — normalização simples (mapeamento de campo, espaço em branco, decimal pt-BR). Nenhum processamento real de PDF/imagem.
- `registry.ts` — deriva `ModuleDataContract[]` diretamente de `src/config/platform-modules.ts` (`consumes`/`produces`) — nenhuma fonte paralela de "quem consome o quê".
- `events.ts` — `InMemoryDataHubEventLog`, registro em memória determinístico.

## Confiança vs. qualidade

- `DataConfidence` responde "o quão confiável é ESTE valor" (confirmado, calculado, estimado, incompleto, divergente, desconhecido).
- `DataQualityStatus` responde "o registro está bem formado" (válido, parcial, inválido, campos ausentes, duplicado, inconsistente, processando, bloqueado).

São eixos independentes — um valor pode ser `quality: "valid"` e `confidence: "estimated"` ao mesmo tempo.
