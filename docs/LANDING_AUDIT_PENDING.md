# Landing Page — Auditoria Pendente

> Status: Aguardando relatório Codex Web
> Atualizado: Julho 2026

---

## Contexto

A landing page da LOKAT OS em `https://www.lokat.com.br` passou por reestruturação completa na Sprint Pública (Julho 2026). O relatório Codex Web identificou problemas no estado anterior. A sprint corrigiu os itens identificados. Este documento registra o que foi feito e o que aguarda nova análise.

---

## Problemas identificados (relatório Codex Web anterior)

| Item | Problema | Status após sprint |
|------|----------|--------------------|
| `/blog` | Retornava 404 | Corrigido — rota criada |
| `/contato` | Retornava 404 | Corrigido — rota criada |
| `/robots.txt` | Retornava 404 | Corrigido — `robots.ts` criado |
| `/sitemap.xml` | Retornava 404 | Corrigido — `sitemap.ts` criado |
| Canonical ausente | `<link rel="canonical">` não presente | Corrigido — `metadataBase` + `alternates.canonical` no layout |
| JSON-LD ausente | Sem schema estruturado | Corrigido — Organization, SoftwareApplication, WebSite na home; BlogPosting nas páginas de artigo |
| React #418 (hidratação) | Erro de hidratação no console | Investigado — `prefers-reduced-motion` corrigido em `globals.css`. Causa raiz confirmada? Pendente |
| Posicionamento Cardápio-cêntrico | Hero e FAQ focados em delivery/restaurante | Corrigido — posicionamento multinicho |

---

## Mudanças realizadas na Sprint Pública

### Posicionamento
- Hero chip, H1 e subtítulo reescritos para posicionamento horizontal (empresas, agências, clínicas, lojas, construção, equipes).
- Cardápio Digital reposicionado como integração opcional, não produto central.
- WhatsApp reposicionado como canal em preparação.
- FAQ atualizado com 7 perguntas cobrindo o escopo real da plataforma.
- Seção multinicho adicionada com 6 nichos: Clínicas, Varejo, Construção, Restaurantes, Agências, Profissionais.
- Seletor de perfil adicionado: Minha empresa, Minha agência, Minha equipe, Contratar LOKAT.

### SEO
- `metadataBase` configurado em `layout.tsx`.
- `alternates.canonical` configurado.
- `robots` meta (`index: true, follow: true`) configurado.
- OG e Twitter metadata atualizados para posicionamento multinicho.
- JSON-LD: `Organization`, `SoftwareApplication`, `WebSite` na home.
- JSON-LD: `BlogPosting` em `src/app/blog/[slug]/page.tsx`.

### Acessibilidade e performance
- `@media (prefers-reduced-motion: reduce)` adicionado em `globals.css` cobrindo todas as animações do hero e ticker.

### Navegação
- Link "Blog" adicionado ao `public-header.tsx`.
- Links do footer (`/privacidade`, `/termos`, `/contato`, `/blog`) corrigidos (eram `href="#"`).

---

## Itens pendentes de verificação

### Aguardando novo relatório Codex Web
- [ ] Confirmar resolução do erro React #418 em produção
- [ ] Validar `robots.txt` e `sitemap.xml` servidos corretamente
- [ ] Confirmar canonical sendo renderizado no `<head>`
- [ ] Confirmar JSON-LD válido via Google Rich Results Test
- [ ] Core Web Vitals (LCP, CLS, FID) — não medidos nesta sprint

### Performance (não auditado nesta sprint)
- [ ] Otimização de imagens (`next/image` com tamanhos corretos)
- [ ] Lazy loading de seções abaixo do fold
- [ ] Fonte (fontes externas vs. self-hosted)
- [ ] Tamanho do bundle JS da landing

### Acessibilidade (não auditado nesta sprint)
- [ ] Ordem de headings H1 → H6 (nenhum salto)
- [ ] Contraste de texto (WCAG AA mínimo 4.5:1 corpo, 3:1 grande)
- [ ] Foco visível em todos os elementos interativos
- [ ] Navegação por teclado na landing completa
- [ ] `aria-label` em ícones e botões sem texto visível
- [ ] Labels corretos em todos os campos do formulário de contato

---

## Próximo passo

Após deploy em produção, solicitar novo relatório Codex Web e atualizar este documento com os resultados.
