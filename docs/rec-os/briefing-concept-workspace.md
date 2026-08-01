# Briefing & Conceito — Sprint REC OS 3.0.1

Implementado como o passo "1. Ideia & Briefing" de `_guided-create-flow.tsx`
— **um único workspace**, não dois menus separados (conforme Fase 6/8:
"Não criar Briefing e Conceito como menus principais separados").

## Briefing vs. Conceito

- **Briefing**: organiza fatos, necessidades e restrições — campos
  Objetivo, Campanha, Oferta/produto, Público, CTA, Referências,
  Observações, Prazo.
- **Conceito**: transforma o briefing em direção criativa — campo Mensagem
  principal (textarea).

Uma única fonte de estado (`brief` no componente) — nenhum campo
duplicado, nenhuma segunda fonte de verdade.

## Campos cobertos vs. lista completa do ticket

Implementados: objetivo, campanha, oferta, público, mensagem central,
CTA, referências, restrições (observações), prazo.

Não implementados nesta sprint (a forma já tem 10 campos; adicionar tom,
diferencial e materiais necessários exigiria expandir o schema de
`guided_create.brief` no draft persistido — registrado como próximo
passo, não fabricado como campo fantasma sem persistência real).

## Ideia (Fase 7)

Respondida implicitamente pelos mesmos campos (objetivo = "o que
comunicar e por quê", público = "para quem", campanha/oferta = origem e
produto) — não fragmentada em uma tela própria, para não multiplicar
menus como o ticket pediu para evitar.
