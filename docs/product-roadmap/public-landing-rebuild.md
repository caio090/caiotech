# Roadmap — Reconstrução da landing pública

Criado na Fase 11 do hotfix Workspaces 1.0.4. **Nada aqui foi implementado.**
Registra o desenho proposto para três áreas de `project-status.ts`:
`public_landing_rebuild`, `public_landing_pricing` e
`public_home_canonical_route`, todas `planned`.

## public_landing_rebuild

Landing mais direta, com hero, rota do negócio, módulos, demonstração,
preços, FAQ e CTA.

Estrutura de seções proposta, em ordem:

1. **Hero** — proposta de valor em uma frase, CTA principal.
2. **Rota do negócio** — um seletor/explicação de qual caminho serve o
   visitante (agência, empresa direta, autônomo) — ecoando conceitualmente
   as três superfícies já existentes no preview de Workspaces
   (`agency`, `direct_business`, `agency_client`), sem reusar código do
   preview em si (são públicos vs. internos, contextos diferentes).
3. **Módulos** — apresentação dos módulos do produto (REC OS, Meu Negócio,
   Financeiro, Integrações).
4. **Demonstração** — vídeo ou capturas de tela, sem dado real de nenhum
   cliente.
5. **Preços** — ver `public_landing_pricing` abaixo.
6. **FAQ** — perguntas frequentes.
7. **CTA final** — chamada para ação de fechamento da página.

## public_landing_pricing

Seção de preços dentro da landing reconstruída. Depende diretamente de
`software_pricing_v1` (ver `docs/product-roadmap/billing-and-pricing.md`)
estar aprovado — **enquanto os valores propostos (R$ 79 / R$ 130 / R$ 250)
não forem validados como preço comercial real, esta seção não deve publicar
nenhum valor**, para não criar uma expectativa de preço que a empresa ainda
não confirmou.

## public_home_canonical_route

Hoje, dependendo do estado do projeto, pode existir mais de uma versão da
home pública coexistindo durante uma reconstrução incremental. Esta área
registra a necessidade de definir explicitamente qual rota é a canônica
antes de a reconstrução ser publicada — evitando duas versões acessíveis
simultaneamente sem redirecionamento claro entre elas (o que confundiria
motores de busca e usuários que já têm o link antigo salvo).

## Fora de escopo desta sprint

- Nenhuma página pública criada ou alterada.
- Nenhum preço publicado.
- Nenhuma rota redirecionada.
- As 3 áreas ficam `planned` em `project-status.ts`.
