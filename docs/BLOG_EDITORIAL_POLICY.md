# Política Editorial — Blog LOKAT OS

> Versão 1.0 · Julho 2026

---

## 1. Propósito

O blog da LOKAT OS existe para produzir conteúdo útil, verdadeiro e rastreável sobre marketing, gestão, tecnologia e operação para empresas, agências e equipes. Não é um canal de vendas disfarçado. Não publica conteúdo pago sem identificação. Não inventa dados ou resultados.

---

## 2. Fluxo editorial obrigatório

Nenhum artigo passa direto de rascunho para publicado.

```
draft
  └─ research      pesquisa e fontes levantadas
       └─ review   revisão editorial humana
            └─ approved  aprovação explícita por um editor
                 └─ [scheduled]  opcional: data futura programada
                       └─ published
```

**Regras imutáveis:**
- Aprovação humana é obrigatória antes de qualquer publicação.
- Nenhum agente de IA pode alterar status diretamente para `published`.
- Um artigo `archived` não pode ser reativado sem nova revisão completa.

---

## 3. Autoria

### 3.1 Humana
Artigos com byline de pessoa real exigem que essa pessoa tenha revisado, aprovado e assumido responsabilidade pelo conteúdo final. Não se atribui byline a quem apenas fez pesquisa inicial.

### 3.2 Assistida por IA
Quando IA auxiliou na produção (pesquisa, estrutura, rascunho), o artigo deve incluir uma nota de rodapé: *"Produzido com auxílio de inteligência artificial. Revisado e aprovado pela equipe editorial LOKAT OS."*

### 3.3 Ghostwriting
Ghostwriting é permitido para especialistas externos (clínicos, construtores, lojistas) que contribuem com conteúdo especializado mas não têm disponibilidade para escrever. O especialista deve revisar e aprovar o texto final antes da publicação.

---

## 4. Fontes

Todo artigo publicado deve ter pelo menos **uma fonte identificada** em `blog_sources`. As fontes são exibidas publicamente ao final do artigo.

**Tipos aceitos:**
| Tipo | Uso |
|------|-----|
| `official` | Sites gov, órgãos reguladores, entidades setoriais |
| `research` | Artigos acadêmicos, relatórios de pesquisa |
| `news` | Jornalismo especializado com data e autor |
| `interview` | Entrevista realizada pela equipe LOKAT OS |
| `internal` | Dados próprios da plataforma (anonimizados) |
| `other` | Referência útil sem categoria acima |

**Proibido:**
- Citar dados sem fonte (ex: "70% das empresas...").
- Inventar estatísticas.
- Usar dados internos de clientes identificáveis sem consentimento explícito.

---

## 5. Conteúdo proibido

- Depoimentos falsos ou atribuídos a pessoas/empresas fictícias.
- Cases inventados ou métricas sem evidência.
- Cópia de texto ou estrutura de concorrentes.
- Conteúdo patrocinado sem identificação clara de `cta_type: sponsored`.
- Artigos com afiliação não declarada (`cta_type: affiliate` deve estar explícito).
- Propaganda política, religiosa ou ideológica.
- Conteúdo sensacionalista sem base factual.

---

## 6. Conflito de interesse

- Artigos sobre produtos ou ferramentas com os quais a LOKAT OS tem relação comercial devem declarar isso.
- Editores não aprovam artigos em que têm interesse direto.
- Conteúdo patrocinado ou de afiliados é marcado visualmente como tal.

---

## 7. Correções e atualizações

- Correções factuais são registradas no `blog_revisions` com nota.
- Correções de dados relevantes exigem nova passagem por `review`.
- Artigos com dados desatualizados são movidos para `research` ou `archived`, não mantidos como publicados.

---

## 8. SEO e metadados

- `seo_title` e `seo_description` são revisados junto com o conteúdo — não são gerados só para SEO.
- `seo_description` limitado a 160 caracteres.
- Slug é permanente após publicação. Não renomear slugs sem configurar redirect.
- Tags são descritivas, não keyword stuffing.

---

## 9. CTA (call to action)

Cada artigo pode ter um único CTA definido em `cta_type`. Regras:

| cta_type | Quando usar |
|----------|-------------|
| `diagnostic` | Padrão — lead para diagnóstico gratuito |
| `platform_trial` | Artigos sobre produto/plataforma LOKAT OS |
| `service_contact` | Artigos sobre serviços consultivos |
| `newsletter` | Artigos de boa-fé sem pitch comercial |
| `affiliate` | Parceria com produto externo (declarada) |
| `sponsored` | Conteúdo pago (declarado) |
| `product` | Produto específico da LOKAT OS |
| `none` | Artigos de serviço público sem pitch |

---

## 10. Agentes de IA editoriais

Agentes de IA integrados ao fluxo editorial são ferramentas de suporte, nunca de decisão final.

**O que um agente pode fazer:**
- Pesquisar fontes e sugerir referências.
- Gerar outline para revisão humana.
- Produzir rascunho inicial.
- Verificar coerência e ortografia.
- Sugerir título e metadados SEO.
- Solicitar capa ao responsável de design.

**O que um agente NUNCA pode fazer:**
- Alterar `status` para `approved` ou `published`.
- Publicar conteúdo sem aprovação humana explícita.
- Inventar dados ou fontes.
- Assinar artigos como autor humano.

Todo agente editorial deve respeitar o contrato definido em `src/lib/blog/editorial-agent/types.ts`, especialmente `requires_human_approval: true`.

---

## 11. Privacidade

- Nomes ou dados de clientes não aparecem em artigos sem consentimento explícito por escrito.
- Dados agregados da plataforma podem ser usados de forma anonimizada.
- Imagens de terceiros requerem licença ou permissão.

---

## 12. Responsabilidade

O editor-chefe da LOKAT OS é responsável final pelo conteúdo publicado. Em ausência de editor-chefe designado, o responsável é o fundador da empresa.

---

*Esta política é revisada semestralmente ou após incidentes editoriais relevantes.*
