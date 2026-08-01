# Finalizar — Sprint REC OS 3.0.1

Ordem implementada em `_guided-create-flow.tsx`: Revisão & Aprovação →
Destino & Especificações → **Visual Final** (último bloco criativo) —
exatamente a ordem obrigatória do ticket.

## Revisão & Aprovação

Passo "3. Revisão & Aprovação": resumo do pacote (cliente, segmento,
campanha, formato, prazo, ID), preview do brief/conteúdo/visual, botão
"Revisão interna" (marca `status: "revisao_interna"` via
`PATCH /api/admin/contentos/drafts/:id`) — reaproveita a fila real de
aprovações (`aprovacoes/page.tsx`), sem criar uma segunda fila
desconectada.

## Destino & Especificações

Passo "4. Destino & Especificações": Calendário / Produção / Aprovação —
mesmas rotas reais (`send-to-production`, `send-to-approval`) já usadas
antes desta sprint. Ver `docs/rec-os/canonical-creative-flow.md` para o
compromisso registrado sobre por que a ação de envio continua aqui em vez
de depois do Visual Final.

## Visual Final

Passo "5. Visual Final" (agora o último): Gerar com IA (bloqueado, sem
provider), Importar visual (upload local, sessionStorage temporário),
Editar no EditorOS (`handleOpenEditor`, restrito a super_admin). Nota de
encerramento explícita: "Último passo criativo — agendar ou publicar
acontece em Calendário/Produção/Aprovação (passo anterior)."
