/**
 * Sprint Recovery 2.1.3 (Fase 17) — conceitos futuros de CRM por nicho,
 * adaptando o núcleo universal (types.ts) sem copiá-lo, seguindo o mesmo
 * princípio de src/config/business-niche-packs.ts. Só registro — nenhum
 * campo aqui é lido por nenhuma tela ou API ainda.
 */
import type { BusinessSegment } from "@/lib/business-profile/types";

export interface CrmNicheConceptSet {
  segment: BusinessSegment;
  label: string;
  concepts: string[];
  warning?: string;
}

export const CRM_NICHE_CONCEPTS: CrmNicheConceptSet[] = [
  {
    segment: "food_service",
    label: "Alimentação",
    concepts: [
      "cliente", "consumidor", "frequencia", "recompra", "ticket", "canal",
      "ultimo_pedido", "item_favorito", "cupom", "avaliacao", "cliente_inativo",
      "recorrencia", "recuperacao",
    ],
    warning: "Não transformar pedido comum automaticamente em oportunidade comercial sem regra confirmada.",
  },
  {
    segment: "construction_materials",
    label: "Materiais de construção",
    concepts: [
      "consumidor", "pedreiro", "construtor", "arquiteto", "engenheiro",
      "empresa", "obra", "orcamento", "lista_de_material", "entrega",
      "vendedor", "recorrencia", "credito", "oportunidade_por_obra",
    ],
  },
  {
    segment: "agency_services",
    label: "Agência e serviços",
    concepts: [
      "lead", "diagnostico", "reuniao", "proposta", "negociacao", "contrato",
      "onboarding", "renovacao", "upsell", "indicacao", "churn",
      "ticket_mensal", "duracao",
    ],
  },
  {
    segment: "construction_projects",
    label: "Construção civil",
    concepts: [
      "cliente", "imovel", "obra", "orcamento", "visita", "proposta",
      "contrato", "medicao", "etapa", "aditivo", "recebimento", "pos_obra",
    ],
  },
  {
    segment: "retail",
    label: "Varejo geral",
    concepts: [
      "consumidor", "compra", "frequencia", "categoria", "canal", "ticket",
      "abandono", "recompra", "fidelidade",
    ],
  },
];

export function findCrmNicheConcepts(segment: BusinessSegment): CrmNicheConceptSet | undefined {
  return CRM_NICHE_CONCEPTS.find((entry) => entry.segment === segment);
}
