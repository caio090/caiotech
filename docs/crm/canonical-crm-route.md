# CRM canônico — Sprint Navegação e Experiência 3.0.1.2

## Por que existe um único CRM

Auditoria (Fase 20) confirmou: `/admin/crm` **não existia** antes desta
sprint — `/admin/leads` já era a única implementação admin real (sidebar,
header, bottom nav, busca e ação rápida já apontavam para lá). Não havia
uma duplicata a "escolher entre" — havia uma implementação e um nome
visível ("CRM") que não batia com a rota (`/admin/leads`).

## Decisão

`/admin/leads` continua sendo a implementação canônica (menor risco,
nenhuma mudança de comportamento). `/admin/crm` foi criado como alias
puro (`redirect()`, preserva query) — nunca uma segunda implementação.

## Waitlist e Central de Leads — a confusão real (bug #8)

`/admin/super/waitlist` ("Lista Beta") e `/admin/super/leads` ("Central de
Leads") **usam a mesma tabela** (`waitlist_entries`, via
`/api/admin/waitlist`) que `/admin/leads` — confirmado lendo os três
arquivos. Antes desta sprint, o card em `/admin/leads` descrevia essas
duas rotas como "entrada no CRM", reforçando a impressão de múltiplos
CRMs.

**O que essas duas rotas realmente são**: ferramentas de onboarding de
plataforma do Super Admin (conceder acesso beta, classificar tipo de
conta) sobre a MESMA base de contatos — não uma segunda interpretação do
CRM comercial. A relação agora é explícita na UI:

- `/admin/leads` descreve o card como "Onboarding de plataforma (Super Admin)", não mais "entrada no CRM".
- `/admin/super/waitlist` e `/admin/super/leads` ganharam um link "← CRM" de volta.

**Fora do escopo desta sprint** (documentado, não escondido): fundir as
três implementações numa única tela. É um refactor de risco alto (3
componentes grandes, com mutações reais de status/tipo de conta) sem
cobertura de QA visual em navegador neste ambiente — registrado como
`crm_canonical_route: qa_pending` para a clarificação feita, não para uma
fusão completa.

## Pipeline

"Pipeline comercial" já é uma seção dentro do próprio `/admin/leads` —
nunca foi um banco separado.
