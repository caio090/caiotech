# Meu Escritório — Sprint Navegação e Experiência 3.0.1.2

## Por que existe

Ecossistema respondia "quais módulos existem" (arquitetura técnica), não
"o que eu preciso fazer hoje". Meu Escritório é a experiência operacional
que faltava: Hoje/Semana/Mês, sobre dados reais já existentes.

## Rota

`/admin/escritorio` — auditado antes de criar: nenhuma rota equivalente
existia (o mais próximo, `/admin/ecossistema`, respondia uma pergunta
completamente diferente).

## Quem acessa

- **Super ADM**: operação da própria Lokat (item fixo no rodapé mobile, no lugar que era do Ecossistema).
- **Agência**: operação da agência — reachable via sidebar/menu "Mais" (não deslocou nenhum dos 4 itens fixos já validados do rodapé mobile: REC OS/Operação/Clientes).
- **Empresa Direta**: operação do próprio negócio — mesmo padrão (reachable via "Mais").
- **Cliente da Agência**: não promovido a módulo principal — mesma decisão da Agência/Empresa Direta quanto ao rodapé mobile.
- **Usuário operacional**: fora do escopo desta sprint (papéis operacionais têm sua própria navegação restrita via proxy.ts, não tocada aqui).

## Isolamento

Reaproveita o mesmo gate (`requireAdminContentOSContext()`) e o mesmo
padrão honesto de falha (403/503 nunca vira redirect para login) já
corrigido nesta sprint para Calendário/REC OS. **Limitação conhecida,
documentada**: isolamento por login real (não-preview) de
agency/agency_client/direct_business continua a mesma lacuna já registrada
para a bottom navigation e o Mapa do Cliente em sprints anteriores.

## Persistência de notas/metas/decisões

Auditado antes de implementar (Fase 16): não existe tabela real de
`goals`/`notes`/`decisions` no schema. Nenhuma tabela nova foi criada.
Rascunho fica em `useState` (componente `DraftNotesCard`), badge "Rascunho
desta sessão", explicitamente avisado como não salvo — nunca
`localStorage`/`sessionStorage`. Persistência real registrada como
`planned` (`business_office_persistence`).
