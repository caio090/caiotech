# Pacotes de Nicho — `src/config/business-niche-packs.ts`

Um pacote de nicho **nunca copia um módulo** — ele adapta linguagem, campos, indicadores, etapas, recomendações, datas sazonais e integrações relevantes sobre o mesmo módulo universal.

## Pacotes definidos nesta sprint

| Pacote | Segmento | Módulos habilitados | Modelo de custo |
|---|---|---|---|
| Empresa geral | `general_business` | meu_negocio, financeiro, crm_leads_clientes, calendario_global, relatorios | Margem genérica |
| Alimentação | `food_service` | meu_negocio, financeiro, calendario_global, relatorios | Ficha técnica / CMV |
| Materiais de construção | `construction_materials` | meu_negocio, financeiro, calendario_global, relatorios | Markup sobre custo do fornecedor |
| Agência e serviços | `agency_services` | rec_os, crm_leads_clientes, calendario_global, relatorios, equipe | Custo interno de hora |
| Construção civil | `construction_projects` | meu_negocio, financeiro, calendario_global, relatorios | Orçado vs. realizado |

## Exemplos genéricos, nunca clientes reais

Nenhum pacote referencia Duh Lanches, O Pedreirão ou qualquer cliente real — apenas terminologia e templates operacionais de exemplo.

## Business Profile

`src/lib/business-profile/types.ts` define `BusinessProfile` como uma **interpretação normalizada** dos dados que já existem em Meu Negócio — não um cadastro paralelo. `enabledNichePack` conecta o perfil ao pacote correspondente.
