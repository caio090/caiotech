# Roadmap — PNG Vidigal (workspace criativo)

Criado na Fase 11 do hotfix Workspaces 1.0.4. **Nada aqui foi implementado.**
Registra o desenho proposto para três áreas de `project-status.ts`:
`png_vidigal_creative_workspace`, `png_vidigal_briefing_flow` e
`editor_os_creative_shell`, todas `planned`.

## png_vidigal_creative_workspace

Workspace em três colunas, com camadas à esquerda, canvas central,
propriedades à direita e ferramentas no topo.

Layout proposto:

```
┌──────────────────────────────────────────────────────────┐
│                    Barra de ferramentas                   │
├───────────┬──────────────────────────────┬───────────────┤
│           │                              │               │
│  Camadas  │            Canvas            │  Propriedades │
│           │                              │               │
│           │                              │               │
└───────────┴──────────────────────────────┴───────────────┘
```

- **Camadas (esquerda)**: lista ordenável de elementos do canvas, visibilidade/bloqueio por camada.
- **Canvas (centro)**: área de edição principal.
- **Propriedades (direita)**: painel contextual do elemento selecionado (posição, cor, tipografia, etc.).
- **Ferramentas (topo)**: seleção de ferramenta ativa (mover, texto, forma, etc.).

## png_vidigal_briefing_flow

Fluxo de briefing que precede a abertura do canvas — coleta objetivo,
referências visuais e formato antes de o usuário começar a editar. Ainda sem
telas ou campos definidos; registrado apenas como etapa necessária antes do
workspace criativo, análogo ao briefing já existente no fluxo guiado do REC
OS (`src/app/admin/contentos/criar/_guided-create-flow.tsx`), que pode servir
de referência de padrão de UX quando esta feature for desenhada.

## editor_os_creative_shell

Antes de construir um workspace de três colunas do zero, esta área registra
a pergunta em aberto: o EditorOS existente (scanner de camadas, canvas já
implementado) deveria ser estendido para servir tanto ao EditorOS quanto ao
futuro PNG Vidigal, ou os dois devem permanecer implementações separadas?
Nenhuma decisão foi tomada nesta sprint — esta é uma nota de arquitetura
para a próxima sprint que tocar este assunto avaliar antes de escrever
qualquer código.

## Fora de escopo desta sprint

- Nenhum componente React criado.
- Nenhuma rota criada.
- Nenhuma decisão de arquitetura tomada sobre reaproveitar o EditorOS.
- As 3 áreas ficam `planned` em `project-status.ts`.
