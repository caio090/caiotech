export interface StockGlossaryEntry {
  id: string;
  /** Linguagem simples primeiro — o termo técnico vem entre parênteses no próprio texto de exibição. */
  simpleLabel: string;
  technicalTerm: string;
  whatIsIt: string;
  howCalculated: string;
  whyItMatters: string;
  whatCanChangeIt: string;
  whatCanUserDo: string;
}

export const STOCK_GLOSSARY: StockGlossaryEntry[] = [
  {
    id: "cmv-real",
    simpleLabel: "Quanto realmente foi consumido",
    technicalTerm: "CMV real",
    whatIsIt: "O valor de insumos que efetivamente saiu do estoque no período, comparado às vendas.",
    howCalculated: "Estoque inicial + compras − estoque final, dividido pelas vendas do período.",
    whyItMatters: "É o número que realmente aconteceu no caixa — a base de comparação para saber se o negócio está gastando mais insumo do que deveria.",
    whatCanChangeIt: "Perdas, cortesias, consumo interno, erro de contagem, roubo, ou simplesmente vendas maiores/menores que o normal.",
    whatCanUserDo: "Comparar com o CMV teórico (lacuna de CMV) para decidir se vale investigar mais a fundo.",
  },
  {
    id: "cmv-teorico",
    simpleLabel: "Quanto deveria ter sido consumido",
    technicalTerm: "CMV teórico",
    whatIsIt: "O valor de insumos que as fichas técnicas dizem que DEVERIAM ter sido usados, dado o que foi vendido.",
    howCalculated: "Soma do custo de ingredientes de cada ficha técnica multiplicado pela quantidade vendida de cada produto.",
    whyItMatters: "É a referência 'no papel' — só é confiável se as fichas técnicas estiverem atualizadas e as porções servidas baterem com o padrão.",
    whatCanChangeIt: "Fichas técnicas desatualizadas, mudança de fornecedor sem atualizar custo, porção real diferente da cadastrada.",
    whatCanUserDo: "Manter as fichas técnicas atualizadas é o que torna esse número confiável.",
  },
  {
    id: "lacuna-cmv",
    simpleLabel: "Consumo não explicado",
    technicalTerm: "Lacuna de CMV",
    whatIsIt: "A diferença entre o que realmente foi consumido (CMV real) e o que deveria ter sido consumido (CMV teórico).",
    howCalculated: "CMV real menos CMV teórico, em valor (R$) e em pontos percentuais.",
    whyItMatters: "Uma lacuna grande e recorrente é um sinal de alerta — mas nunca uma prova isolada de problema.",
    whatCanChangeIt: "Ficha técnica desatualizada, porção acima do padrão, perdas, cortesias, consumo interno, erro de compra ou erro de contagem.",
    whatCanUserDo: "Investigar as causas mais prováveis antes de tirar conclusões — a lacuna aponta ONDE olhar, não o motivo.",
  },
  {
    id: "margem-contribuicao",
    simpleLabel: "Quanto cada venda ajuda a pagar a empresa",
    technicalTerm: "Margem de contribuição",
    whatIsIt: "O que sobra do preço de venda depois de descontar o custo direto do produto (ingredientes + embalagem).",
    howCalculated: "Preço praticado menos custo total do produto (ingredientes + embalagem).",
    whyItMatters: "É o valor que sobra para pagar despesas fixas, impostos e, no fim, gerar lucro — mas ainda não é lucro líquido.",
    whatCanChangeIt: "Mudança no preço de venda, no custo dos ingredientes, ou no custo de embalagem.",
    whatCanUserDo: "Comparar a margem entre produtos ajuda a decidir o que vale mais a pena vender/destacar.",
  },
  {
    id: "fator-correcao",
    simpleLabel: "Perda entre o peso comprado e o utilizável",
    technicalTerm: "Fator de correção",
    whatIsIt: "Quanto do peso comprado de um ingrediente se perde na limpeza/preparo antes de ir para a receita.",
    howCalculated: "Peso bruto (como comprado) dividido pelo peso líquido (já limpo, pronto para uso).",
    whyItMatters: "Sem esse ajuste, o custo real de um ingrediente é subestimado — comprar 130 g para usar 100 g custa mais por grama útil do que parece.",
    whatCanChangeIt: "Qualidade do insumo, técnica de limpeza/corte, tipo de corte comprado.",
    whatCanUserDo: "Atualizar o fator de correção sempre que trocar de fornecedor ou técnica de preparo.",
  },
  {
    id: "cobertura-estoque",
    simpleLabel: "Quantidade disponível antes de uma nova compra",
    technicalTerm: "Cobertura de estoque",
    whatIsIt: "Por quantos dias o estoque atual de um item dura, no ritmo de consumo médio.",
    howCalculated: "Estoque disponível dividido pelo consumo médio diário.",
    whyItMatters: "Ajuda a decidir quando comprar sem esperar faltar o insumo no meio de uma produção.",
    whatCanChangeIt: "Mudança no ritmo de vendas, promoções, sazonalidade, atraso de fornecedor.",
    whatCanUserDo: "Usar a cobertura junto com o ponto de reposição para decidir a quantidade e o momento da próxima compra.",
  },
];

export function findStockGlossaryEntry(id: string): StockGlossaryEntry | undefined {
  return STOCK_GLOSSARY.find((e) => e.id === id);
}
