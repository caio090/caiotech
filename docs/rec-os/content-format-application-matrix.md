# Aplicação & Formato — Sprint REC OS 3.0.1

`src/lib/rec-os-workflow/types.ts`: `ContentPurpose` (10 finalidades:
vender, informar, educar, posicionar, captar_lead, lançar, reativar,
aumentar_ticket, divulgar_evento, comunicação_interna) e `ContentFormat`
(13 formatos: arte estática, carrossel, story, reel, vídeo, anúncio,
banner, outdoor, telão, impresso, e-mail, mensagem, apresentação) — só o
enum estrito, registrado para uso futuro em formulários estruturados.

## Roteiro condicional (Fase 10)

`contentFormatRequiresScript()` (enum estrito) e
`freeTextFormatRequiresScript()` (adaptador para o campo de texto livre
real do formulário — `brief.format` não é o enum, é texto digitado)
implementados e **wired na UI real** (`_guided-create-flow.tsx`, passo
"Aplicação & Formato"):

- Aparece para: vídeo, Reel, anúncio em vídeo, apresentação narrada.
- Nunca obrigatório para: arte estática, banner, outdoor, telão, impresso.
- Carrossel usa "Estrutura de slides" (página a página, copy, CTA) — nunca
  chamado de "roteiro" (`freeTextFormatUsesPageStructure()`).
- Quando nenhum dos dois se aplica, uma nota explica que os campos
  aparecem automaticamente conforme o formato.

Normalização por palavra-chave (não igualdade exata) porque o campo de
formato é texto livre — "Vídeo institucional" e "Reel de bastidores"
disparam a mesma regra que "vídeo"/"reel" sozinhos.
