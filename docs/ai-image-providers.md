# AI Image Providers — Provedores de Geração de Imagem

---

## Conceito

A LOKAT OS usa uma **conta central** (do dono da plataforma) para pagar os provedores de IA.
Clientes compram créditos internos — não têm acesso às chaves de API.

**Nunca expor chaves no frontend.**

---

## Provedores suportados

### Google Imagen 3 (Nano Banana Pro)

"Nano Banana Pro" = Gemini 3 Pro Image = **Imagen 3** do Google.

- Arquivo: `src/lib/ai/image-providers/google-gemini.ts`
- Variável: `GOOGLE_GEMINI_API_KEY`
- Modelo padrão: `imagen-3.0-generate-001` (via `GOOGLE_IMAGE_MODEL`)
- Suporte a: aspect ratio, sample count, safety filter
- Cobrança Google: por imagem / resolução (verificar pricing atual)
- Capacidade futura: referência de estilo, pessoa (via edição de imagem)

### OpenAI Images (GPT Image e DALL-E)

- Arquivos: `src/lib/ai/image-providers/openai-images.ts` (provider, usa o
  SDK oficial `openai`), `openai-image-compat.ts` (resolve a família do
  modelo e monta o request só com os parâmetros válidos pra ela) e
  `openai-image-response.ts` (normaliza a resposta e os erros).
- Variável: `OPENAI_API_KEY`
- Modelo padrão: `dall-e-3` (via `OPENAI_IMAGE_MODEL`) — mas o adapter
  reconhece qualquer modelo do union `ImageModel` do SDK instalado
  (`gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5`, `gpt-image-2`,
  `gpt-image-2-*`, `chatgpt-image-latest`, `dall-e-2`, `dall-e-3`) e
  monta o request certo pra cada família — nunca trata todos os
  modelos como se aceitassem os mesmos parâmetros (Prompt 09).
- `response_format` **nunca** é enviado, pra nenhuma família — a API
  real de Production rejeitou esse parâmetro mesmo pro modelo default
  (`dall-e-3`), então o normalizador aceita tanto `b64_json` quanto
  `url` na resposta, o que vier.
- Suporte a: size/quality por família real (ver `openai-image-compat.ts`
  pra matriz completa), n (1 pra dall-e-3, até 10 pra gpt-image-*/dall-e-2).
- Cobrança OpenAI: por imagem / tamanho / qualidade

---

## Seleção do provedor

Variável: `AI_IMAGE_PROVIDER`

| Valor | Provedor |
|---|---|
| `google` ou `google-gemini` | Google Imagen |
| `openai` ou `openai-images` | OpenAI DALL-E |
| (não definida) | Auto-detect: primeiro disponível |

---

## Variáveis de ambiente

Configurar na Vercel **somente quando for ativar geração real**:

```
AI_IMAGE_PROVIDER=google
GOOGLE_GEMINI_API_KEY=AIza...
GOOGLE_IMAGE_MODEL=imagen-3.0-generate-001

# ou OpenAI:
AI_IMAGE_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=dall-e-3
```

---

## Arquitetura plugável

```
src/lib/ai/image-providers/
  types.ts          ← Interface ImageProvider
  google-gemini.ts  ← Implementação Google
  openai-images.ts  ← Implementação OpenAI
  index.ts          ← Factory + isAiImageAvailable()
```

Para adicionar novo provedor: implementar a interface `ImageProvider` e registrar no `index.ts`.

---

## Riscos de custo

- Nunca permitir geração ilimitada
- Sempre verificar `remaining_credits` antes de chamar o provider
- Monitorar custo real no painel do Google/OpenAI
- Definir alerta de gasto mensal
- `estimated_provider_cost` salvo em `ai_generation_jobs` para auditoria interna

---

## Limites por plano

| Plano | Créditos/mês | Imagens estimadas (simples) |
|---|---|---|
| Básico | 50 | ~50 |
| Pro | 150 | ~150 |
| Agência | 500 | ~500 |

Imagens com referência, pessoa ou produto consomem mais créditos.

---

## Modo disabled (sem chave)

Quando nenhuma chave estiver configurada:
- `isAiImageAvailable()` retorna `false`
- UI exibe banner "Estrutura pronta — geração real pendente"
- Pipeline, créditos, ativos e saídas funcionam normalmente
- Nenhuma chamada HTTP ao provider é feita

---

## Criação da conta central

1. Criar conta no Google AI Studio (ai.google.dev) ou OpenAI Platform
2. Gerar chave de API
3. Adicionar na Vercel como variável de ambiente (não no código)
4. Monitorar uso no painel do provedor
5. Configurar alerta de custo máximo mensal
