# Modelo de Temperatura do Lead — Sprint Recovery 2.1.3

`CrmLeadTemperature` em `src/lib/crm-adaptive/types.ts`. **Nenhum motor de
cálculo implementado nesta sprint** — só os estados conceituais e os
fatores futuros do score.

## Estados

| Valor | Rótulo |
|---|---|
| `cold` | Frio |
| `warming` | Em aquecimento |
| `warm` | Morno |
| `hot` | Quente |
| `customer` | Cliente |
| `inactive` | Inativo |
| `lost` | Perdido |

## Regra explícita

**Não calcular temperatura apenas por opinião manual.** Quando o motor de
score existir, ele deve derivar a temperatura de fatores observáveis, não
de um campo livre editado sem critério.

## Fatores futuros do score (`CRM_TEMPERATURE_SCORE_FACTORS`)

recência, frequência, interação, canal, resposta, reunião, proposta,
orçamento, comportamento, perfil, fit, valor, urgência, histórico.

A regra deve ser **configurável por nicho** — o peso de "orçamento" para
Construção Civil é diferente do peso de "recompra" para Alimentação (ver
`crm-niche-adapters.md`).

## Próximos passos

Nenhum cálculo automático antes de dados reais suficientes existirem para
calibrar os pesos por nicho — implementar primeiro como um indicador
manual editável (fonte `manual`), migrar para calculado só depois de
validado contra decisões humanas reais.
