# CRM Mobile — Sprint REC OS 3.0.1

`src/components/crm/crm-mobile-lead-list.tsx` +
`src/components/crm/crm-mobile-filter-sheet.tsx`, wired em
`src/app/admin/leads/page.tsx`.

## Cards em vez de tabela

`CrmMobileLeadList` substitui a tabela desktop (`<table>`, sempre com
`overflow-x-auto` no mobile — a causa da "coluna saindo da tela") por
cards, visível só em `md:hidden`; a tabela ganhou `hidden md:block`.
**Mesma fonte**: ambos consomem `filtered` (o mesmo `useMemo` já filtrado
por origem/etapa) — nenhuma segunda consulta, nenhum segundo cálculo.

Cada card mostra: nome, contato (e-mail/telefone), origem (badge colorido
igual ao desktop), intenção (quando houver), etapa/status, data de
criação, e três ações compactas (Agente IA, WhatsApp quando houver
telefone, Ver na waitlist) — reaproveitando exatamente os mesmos handlers
já existentes (`setAgenteLead`, o link `wa.me`, o link `/admin/super/waitlist`).

**Temperatura**: não implementada — o ticket pede "temperatura somente
quando existir dado real" e "não inventar hot/warm/cold". `WaitlistEntry`
não tem nenhum campo de temperatura hoje, então o card simplesmente não
mostra esse campo, em vez de calculá-lo ou simulá-lo.

## Filtros em sheet

`CrmMobileFilterSheet`: botão "Filtros" com contador de filtros ativos,
chips só dos filtros realmente ativos (não todas as opções sempre
visíveis), sheet inferior com Origem e Etapa, "Aplicar"/"Limpar"/"Fechar".
Reaproveita exatamente o mesmo estado (`srcFilter`/`statusFilter`) da
versão desktop — os dois filtros originais (`Origem`/`Etapa`, sempre
visíveis em duas linhas de chips) ganharam `hidden md:flex`.

**Cobertura parcial, declarada**: o ticket original pede filtros de
responsável, temperatura, canal, período, próxima ação e atraso — nenhum
desses campos existe na fonte de dado real (`WaitlistEntry`) hoje, então
só Origem e Etapa foram implementados. Adicionar os demais exigiria
primeiro adicionar essas colunas ao schema real, fora do escopo desta
sprint (que reorganiza UI existente, não adiciona schema).

## Desktop preservado

Tabela, busca (inexistente nesta página — não removida, só nunca
existiu), filtros de chip, ações por linha: todos intocados, agora sob
`hidden md:flex`/`hidden md:block` em vez de sempre visíveis. Nenhuma
lógica de filtro duplicada entre mobile e desktop.
