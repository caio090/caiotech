# Adaptadores de nicho do CRM — Sprint Recovery 2.1.3

`CRM_NICHE_CONCEPTS` em `src/lib/crm-adaptive/niches.ts`. Cada entrada
adapta o núcleo universal (`adaptive-crm-architecture.md`) com
terminologia e conceitos do segmento — nunca copia o módulo.

| Segmento (`BusinessSegment`) | Rótulo | Conceitos |
|---|---|---|
| `food_service` | Alimentação | cliente, consumidor, frequência, recompra, ticket, canal, último pedido, item favorito, cupom, avaliação, cliente inativo, recorrência, recuperação |
| `construction_materials` | Materiais de construção | consumidor, pedreiro, construtor, arquiteto, engenheiro, empresa, obra, orçamento, lista de material, entrega, vendedor, recorrência, crédito, oportunidade por obra |
| `agency_services` | Agência e serviços | lead, diagnóstico, reunião, proposta, negociação, contrato, onboarding, renovação, upsell, indicação, churn, ticket mensal, duração |
| `construction_projects` | Construção civil | cliente, imóvel, obra, orçamento, visita, proposta, contrato, medição, etapa, aditivo, recebimento, pós-obra |
| `retail` | Varejo geral | consumidor, compra, frequência, categoria, canal, ticket, abandono, recompra, fidelidade |

Reaproveita o mesmo `BusinessSegment` de `src/lib/business-profile/types.ts`
(o vocabulário de segmento mais alinhado aos pacotes de nicho da Core 2.1)
— não introduz um quarto vocabulário de segmento.

## Regra explícita: nenhuma conversão automática

Para Alimentação: **não transformar um pedido comum automaticamente em
oportunidade comercial sem regra confirmada.** Um pedido de delivery não
é, por padrão, um lead comercial — só vira um quando uma regra explícita
(ainda não implementada) decidir isso, nunca por inferência automática.

## Próximos passos

Implementar um adaptador por vez, começando por Alimentação (único
arquétipo com experiência real hoje no Centro de Comando), reaproveitando
o padrão já usado por `business-niche-packs.ts` e pela área DNA &
Estratégia (Sprint Meu Negócio 2.1.2) de "adaptar sem duplicar".
