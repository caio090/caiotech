# Referências open source do dashboard Meu Negócio

Consulta realizada em 28/07/2026. As referências foram usadas apenas para estudar padrões de composição, densidade, navegação e acessibilidade. Nenhum arquivo ou componente foi copiado integralmente.

| Repositório | Licença | Finalidade estudada | Padrões aproveitados | Padrões rejeitados |
|---|---|---|---|---|
| [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) | MIT | Organização feature-based, overview, cards, tabelas e filtros | Hierarquia compacta, estados locais e conteúdo por recurso | Clerk, billing, autenticação, backend e migração para shadcn |
| [tremorlabs/tremor](https://github.com/tremorlabs/tremor) | Apache-2.0; subcomponentes indicados no projeto sob MIT | Cards analíticos, progressos, comparações e estados vazios | Densidade de informação, metadados próximos ao valor e progressos acessíveis | Dependência Tremor e cópia de componentes |
| [ant-design/ant-design-pro](https://github.com/ant-design/ant-design-pro) | MIT | Organização empresarial, page headers, filtros e monitoramento | Navegação contextual e cabeçalhos orientados à tarefa | Ant Design, Pro Components e estrutura de aplicação externa |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT | Drawer, tooltip, tabs, foco e acessibilidade | Foco visível, semântica de diálogo, agrupamento de controles | Migração global, registry e componentes copiados |
| [TailAdmin/free-nextjs-admin-dashboard](https://github.com/TailAdmin/free-nextjs-admin-dashboard) | MIT | Dashboard financeiro escuro, grids responsivos e gráficos | Grid de 12 colunas, hierarquia de KPIs e painéis compactos | Templates, autenticação, páginas e dependências externas |

## Decisões locais

- Tailwind, Recharts, Lucide e componentes do repositório continuam sendo a base.
- Nenhuma dependência foi adicionada.
- Nenhuma autenticação, API, banco, billing ou integração externa foi copiada.
- Os componentes novos foram escritos especificamente para o domínio do Lokat OS.
- O dashboard evita gráficos decorativos, 3D, excesso de cores e linguagem contábil conclusiva.
