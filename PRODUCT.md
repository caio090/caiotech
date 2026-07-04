# Product

## Register

product

## Users

Três perfis principais operando o mesmo sistema:

- **Admins / gestores de agência**: acessam o painel admin diariamente. Veem dashboards de clientes, aprovam conteúdo, acompanham financeiro, distribuem tarefas e monitoram performance. Alta frequência de uso; velocidade e clareza são críticas.
- **Produtores / redatores de conteúdo**: operam o ContentOS — criam, editam, publicam e gerenciam conteúdo. Fluxo orientado a tarefas com ciclos de aprovação.
- **Clientes das agências**: acessam portal de cliente para ver resultados, aprovar peças e acompanhar entregas. Uso ocasional; expectativa de clareza e confiança, não de complexidade.

## Product Purpose

Lokat OS é o sistema operacional de agências de marketing e conteúdo — uma plataforma SaaS que centraliza ContentOS (gestão de conteúdo), Growth (funil, diagnósticos, metas), Financeiro (contratos, recibos, inadimplência), Academy (cursos e materiais) e Operacional (tarefas, pipeline comercial, kanban). O sucesso é quando uma agência consegue operar todos os seus clientes e processos internos sem sair do sistema.

## Brand Personality

Profissional, inteligente, preciso.

A agência que usa o Lokat OS deve parecer maior e mais organizada do que realmente é. O sistema transmite confiança operacional — não é brinquedo, não é genérico, não é SaaS-creme.

## Anti-references

- SaaS branco genérico (Notion, ClickUp default) — plano, sem identidade
- Dark themes grafite sem personalidade (Slack escuro, Linear básico) — sem alma
- Paletas coloridas demais / dashboard "Rainbow" — distraem do trabalho
- Glassmorphism decorativo sem propósito — tendência sem função
- Cards com ícone + texto repetidos em grid uniforme — template, não design

## Design Principles

1. **Velocidade como respeito.** Toda interação que um admin faz dezenas de vezes por dia deve ser instantânea e sem atrito — animações curtas, densidade informacional alta.
2. **Confiança antes de delícia.** Hierarquia clara e dados legíveis antes de detalhes visuais. Um número errado ou ilegível é pior que uma animação ausente.
3. **Dark-native, não dark-mode.** O sistema foi projetado para dark. Não é uma inversão de um tema claro; é o estado natural.
4. **Personalidade discreta, execução impecável.** O acento roxo (#7b6ef6) e o vermelho coral (#e0635a) existem com propósito — estados, ações, alertas — não como decoração.
5. **Densidade com respiração.** Painéis de admin exigem informação densa, mas cada tela tem uma hierarquia clara: o que o usuário precisa decidir agora está no topo e em destaque.

## Accessibility & Inclusion

- WCAG AA como linha de base (contraste 4.5:1 para body text, 3:1 para headings grandes)
- Suporte a `prefers-reduced-motion` nas animações de transição de página e reveals
- Interface primariamente em português brasileiro
- Responsivo: mobile-first nos módulos cliente/portal; desktop-first nos painéis admin
