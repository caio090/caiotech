# Meu Negócio — plano Motion e piloto 3D V1

## Estado consolidado

- Base de Motion: `feat/meu-negocio-motion-3d-refinement-v1`.
- Contraste incorporado de `fix/meu-negocio-dashboard-visual-contrast-v1`.
- Tema local preservado por `.mn-dashboard-theme`.
- GSAP e Three.js ainda não fazem parte do runtime.
- `framer-motion` já existe no produto e deve permanecer isolado nas superfícies atuais durante o piloto.

## Princípios GSAP aplicáveis

- Usar `@gsap/react` com `useGSAP`, `scope` por container e limpeza automática.
- Sequenciar entradas com timelines e labels, sem cadeias de `delay`.
- Animar `transform` e `autoAlpha`; evitar propriedades que provoquem layout.
- Usar `gsap.matchMedia()` para breakpoints e `prefers-reduced-motion`.
- Manter duração curta, stagger discreto e nenhuma animação essencial à compreensão.
- Não misturar GSAP e Framer Motion no mesmo elemento ou ciclo de vida.

## Plano GSAP

1. Centro de Comando
   - Entrada única do container após hidratação.
   - Título, contexto e ações com `autoAlpha` e pequeno deslocamento em `y`.
   - Timeline limitada à primeira entrada, sem replay a cada atualização de estado.

2. Oito áreas
   - Transição entre áreas no desktop e seletor no mobile.
   - Animar somente o painel de conteúdo; manter foco, estado e navegação funcionais sem JS de animação.
   - Evitar animar altura do layout; usar troca curta de `autoAlpha` e `x`.

3. KPIs
   - Stagger curto nos seis KPIs principais.
   - Valores finais permanecem no DOM desde o início para acessibilidade.
   - Sem contadores artificiais nesta fase.

4. Alertas
   - Expansão com timeline controlada e estados reversíveis.
   - Preservar `details`/ARIA ou semântica equivalente e foco do teclado.

5. Drawers
   - Backdrop com `autoAlpha`; painel com `xPercent`.
   - Entrada e saída na mesma timeline reversível.
   - Foco, Escape e restauração de foco continuam sendo requisitos funcionais separados da animação.

6. Pergunte à Lokat
   - Abertura do painel e feedback visual de carregamento sem animar texto de resposta linha a linha.
   - Respeitar loading, erro, fallback sem chave e reduced motion.

7. Reduced motion
   - Com `prefers-reduced-motion: reduce`, aplicar estados finais imediatamente.
   - Nenhum loop, parallax ou movimento contínuo obrigatório.

## Plano Three.js opcional

- Único piloto: `LokatIntelligenceOrb` dentro do Assistente.
- Desktop apenas; mobile e reduced motion usam fallback estático.
- Carregamento lazy após abertura do Assistente e somente no cliente.
- Three.js, Fiber e Drei não entram no bundle inicial da rota.
- Cena mínima: uma esfera, material simples, iluminação econômica e interação de ponteiro limitada.
- Render loop pausado quando o painel estiver fechado ou a aba não estiver visível.
- Canvas com descarte completo de listeners, geometrias, materiais e renderer.
- Sem pós-processamento, sombras pesadas, modelos externos ou raycasting global no piloto.

## Componentes candidatos

- `src/app/admin/meu-negocio/_restaurant-workspace.tsx`
- `src/app/admin/meu-negocio/_command-center-dashboard.tsx`
- `src/app/admin/meu-negocio/_ask-lokat-panel.tsx`
- `CommandCenterDashboard`, `ExecutiveMetric`, alertas e `TraceDrawer`.

## Orçamento e riscos

- GSAP + React adicionam runtime novo, mas o impacto pode ser contido por importação apenas no módulo Meu Negócio.
- Three.js/Fiber/Drei têm impacto significativamente maior e exigem lazy loading por fronteira dinâmica.
- `framer-motion` já está instalado; a coexistência é aceitável somente com ownership explícito por superfície.
- O piloto 3D deve ser removível sem afetar o Assistente, a navegação ou os dados.

## Critérios para o próximo comando

- Instalar GSAP e `@gsap/react` apenas após aprovação explícita.
- Instalar Three.js/Fiber/Drei somente se o piloto 3D for aprovado.
- Implementar GSAP primeiro; validar typecheck, lint, testes, build e reduced motion.
- Implementar o Orb depois, isolado por lazy loading e fallback estático.
- Não alterar main, Production ou Vercel durante o refinamento.
