# Roadmap — Billing e precificação

Criado na Fase 11 do hotfix Workspaces 1.0.4. **Nada aqui foi implementado**
— nenhum modal, nenhum checkout, nenhum preço publicado. Registra o desenho
proposto para duas áreas de `project-status.ts`: `billing_upgrade_modal` e
`software_pricing_v1`, ambas `planned`.

## billing_upgrade_modal

Comparação de planos em modal, sem checkout funcional enquanto o billing não
estiver aprovado.

Isto é deliberadamente uma vitrine, não um fluxo de compra: o modal
mostraria os planos lado a lado (recursos, limites) para o usuário entender
as opções, mas qualquer botão de "assinar"/"fazer upgrade" ficaria desabilitado
ou levaria a um contato manual — nunca a um checkout real — até que o
módulo de billing (`api/billing/checkout`, `api/billing/coupons`) seja
formalmente aprovado para uso em Production com este propósito.

## software_pricing_v1

Planos propostos:

| Plano | Preço proposto |
|---|---|
| — | R$ 79 |
| — | R$ 130 |
| — | R$ 250 |

**Estes valores são uma proposta interna, não um preço comercial validado.**
Nenhum destes valores foi publicado em nenhuma página pública, nenhum plano
foi criado em `src/lib/billing/plans.ts` com estes preços, e nenhuma cobrança
real usa estes números. Qualquer sprint futura que queira tornar estes
valores reais precisa de aprovação explícita antes de tocar
`software_pricing_v1` `qa_pending`, e muito menos `validated`.

## Relação com o billing existente

O projeto já tem uma infraestrutura real de billing (`src/lib/billing/plans.ts`,
`src/lib/billing/providers.ts`, `/api/billing/checkout`, `/api/admin/billing/coupons`),
protegida por `withMutationProtection` desde o hotfix Workspaces 1.0.2. Este
roadmap não substitui essa infraestrutura — `billing_upgrade_modal` seria uma
nova UI de apresentação sobre os planos que `PLANS` já define;
`software_pricing_v1` é uma proposta de VALORES, não uma proposta de
reescrever o motor de cobrança.

## Fora de escopo desta sprint

- Nenhum componente de modal criado.
- Nenhum valor de preço alterado em `src/lib/billing/plans.ts`.
- Nenhuma cobrança real criada ou testada.
- As 2 áreas ficam `planned` em `project-status.ts`.
