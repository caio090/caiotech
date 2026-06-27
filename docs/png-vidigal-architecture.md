# PNG Vidigal — Arquitetura

**Versão:** V1 Conceitual  
**Localização:** `/admin/contentos/visual?client=<id>`  
**Módulo pai:** ContentOS

---

## Visão Geral

O PNG Vidigal é o motor visual da LOKAT OS. Não é apenas um gerador de imagem — é um sistema conectado à estratégia, aos ativos, aos dados comerciais e ao controle de créditos do cliente.

Cada criativo gerado tem contexto. O sistema sabe:
- Quem é a marca (Base Estratégica)
- O que está vendendo (OlaClick / relatório)
- Qual a sazonalidade (Radar de Tendências)
- Qual estilo visual usar (Perfil Visual)
- Quantos créditos restam (Carteira de IA)

---

## Pipeline por Nós

O pipeline é uma sequência de blocos/nós que passam informação para o próximo.

### Fluxo visual

```
[Nós Globais] → [■ CENTRALIZADOR] → [Nós Específicos] → [■ RESULTADO]
```

### Tipos de nós

| Nó | Tipo | Herança | Fonte |
|---|---|---|---|
| Cliente | Global | Todos | Supabase clients |
| Ativos Globais | Global | Todos | client_visual_assets |
| Contexto Estratégico | Global | Todos | onboarding_profiles |
| Dados Comerciais | Global | Todos | OlaClick / relatório |
| Temporada | Global | Todos | Manual / Google Trends (futuro) |
| **■ Centralizador** | **Ponto focal** | — | — |
| Referência Visual | Específico | Por resultado | URL / upload |
| Copy / Prompt | Específico | Por resultado | Texto do usuário |
| **■ Resultado** | **Saída** | — | Provider IA |

### Lógica de herança

- **Antes do Centralizador** = informação **global** → herdada por TODOS os resultados do fluxo
- **Depois do Centralizador** = informação **específica** → afeta apenas UM resultado

**Exemplo:**
- Logo conectado antes → aparece em todos os criativos
- Referência de mood board conectada depois → afeta só aquele resultado

---

## Integração com ContentOS

| Módulo | Dados usados pelo PNG Vidigal |
|---|---|
| Base Estratégica | Tom de voz, segmento, objetivo, canais |
| Campanhas | Campanha ativa, período, objetivo |
| Calendário | Próximas datas, conteúdos agendados |
| Insights | Dados Meta (alcance, engajamento) |
| Relatórios | Resultados de conteúdo anteriores |
| Produção | Status dos conteúdos em andamento |

---

## Integração com Dados Comerciais

Quando OlaClick ou relatório estiver conectado:
- Identificar produto parado → sugerir criativo de promoção
- Produto mais vendido → reforçar visualmente
- Queda de venda → criar urgência
- Horário de pico → adaptar criativo

---

## Controle de Créditos

Ver `docs/ai-credits.md` para detalhes completos.

Fluxo:
1. Usuário configura o pipeline
2. Sistema estima custo em créditos
3. Usuário confirma
4. Sistema debita créditos no ledger
5. Provider gera as imagens
6. Em caso de falha: créditos são devolvidos

---

## Provedores de Imagem

Ver `docs/ai-image-providers.md` para detalhes.

- Google Imagen 3 (Nano Banana Pro)
- OpenAI DALL-E 3 / gpt-image-1
- Seleção via variável `AI_IMAGE_PROVIDER`

---

## Saídas do PNG Vidigal

Cada resultado pode ser:
- Salvo como rascunho
- Enviado para aprovação (ContentOS Aprovações)
- Enviado para produção (ContentOS Produção)
- Vinculado a campanha
- Salvo no calendário
- Exportado
- Variações geradas

---

## Roadmap

### V1 (atual)
- [x] Pipeline visual conceitual
- [x] Controle de créditos (estrutura)
- [x] Biblioteca de ativos (estrutura)
- [x] Contexto estratégico integrado
- [x] Contexto comercial integrado
- [x] Contexto de temporada (manual)
- [x] Provedores plugáveis (preparados)
- [x] SQL 40 com tabelas necessárias

### V1.5
- [ ] Upload de ativos reais (Storage)
- [ ] Criação da carteira de créditos no onboarding
- [ ] Google Drive para ativos
- [ ] Geração real com Google Imagen

### V2
- [ ] Editor de nós drag-and-drop
- [ ] Lote do mês automático
- [ ] Meta Insights alimentando sugestões
- [ ] Tendências via Google Trends
- [ ] Múltiplos resultados paralelos
- [ ] Compra de créditos extras
