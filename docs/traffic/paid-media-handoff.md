# Mídia & Tráfego — Sprint REC OS 3.0.1

**Estado: `planned`.** `PaidMediaBrief` registrado em
`src/lib/rec-os-workflow/types.ts` (workspaceId, campaignId, contentIds,
objective, audience, channel, budget, period, destinationUrl, tracking,
creativeRequirements, restrictions, expectedResult, status:
draft/ready/handed_off) — contrato puro, nenhuma tela, nenhuma API.

## Por que separado do REC OS

Gestão de anúncios (orçamento, segmentação, plataforma de mídia paga) é um
domínio diferente de produção criativa — misturar os dois dentro da
criação do REC OS confundiria "criar o criativo" com "pagar para
distribuí-lo". Fluxo conceitual:

```
Campanha comercial → REC OS produz criativos → Conteúdo aprovado →
Mídia & Tráfego recebe criativos → Anúncio → Resultado retorna
```

## O que esta sprint NÃO fez

Nenhuma integração com Meta Ads, Google Ads ou qualquer plataforma de
mídia paga. Nenhuma API nova. `contentIds: string[]` no contrato já prevê
receber múltiplos conteúdos aprovados do REC OS quando implementado — a
ponte real (REC OS → Mídia & Tráfego) ainda não existe em código.
