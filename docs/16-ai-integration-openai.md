# Integração OpenAI — LOKAT OS

## Variável de ambiente

```
OPENAI_API_KEY=sk-...
```

**Onde configurar:**
- Vercel → Project Settings → Environment Variables → Add
- Ambiente: Production + Preview + Development
- Nunca usar `NEXT_PUBLIC_` prefix — a chave NUNCA pode ir ao browser

**Para desenvolvimento local:**
```
# .env.local (não comitar no git)
OPENAI_API_KEY=sk-...
```

---

## Rotas criadas (server-side only)

Todas as rotas ficam em `src/app/api/ai/` e rodam apenas no servidor Next.js.

| Rota | Método | Função |
|---|---|---|
| `/api/ai/diagnostico` | POST | Gera diagnóstico estratégico de marca |
| `/api/ai/briefing` | POST | Gera briefing completo de conteúdo |
| `/api/ai/legenda` | POST | Gera 3 opções de legenda/copy |

---

## Como chamar no frontend

```typescript
// CORRETO — chama a rota do servidor
const res = await fetch("/api/ai/diagnostico", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ marca, objetivo, publico, tom, redes }),
});
const { result, error } = await res.json();

// ERRADO — nunca fazer isso
// process.env.NEXT_PUBLIC_OPENAI_API_KEY  ← NÃO EXISTE
// fetch("https://api.openai.com/...", { headers: { Authorization: `Bearer ${key}` } })
```

---

## Modelo usado

`gpt-4o-mini` — mais barato, rápido e suficiente para copy e diagnósticos.

Para funcionalidades mais complexas (análise de imagem, agentes), usar `gpt-4o`.

---

## Fallback quando IA não está configurada

Todas as rotas retornam `503` quando `OPENAI_API_KEY` não está definida:

```json
{ "error": "IA não configurada." }
```

O frontend deve tratar esse caso e mostrar mensagem ao usuário.

---

## Testar localmente

```bash
# 1. Configurar .env.local com a chave
# 2. Iniciar o servidor
npm run dev

# 3. Testar via curl
curl -X POST http://localhost:3000/api/ai/legenda \
  -H "Content-Type: application/json" \
  -d '{"tema":"Promoção de verão","canal":"Instagram","tom":"descontraído","marca":"Duh Lanches"}'
```

---

## Testar na Vercel (preview)

1. Adicionar `OPENAI_API_KEY` nas env vars da Vercel (ambiente Preview)
2. Fazer push para branch de test/preview
3. Acessar a URL de preview gerada pela Vercel
4. Testar a rota `/api/ai/...` via browser ou curl

---

## Próximas funções a implementar

- `/api/ai/roteiro` — gerar roteiro para RecOS
- `/api/ai/ideias-campanha` — ideias de campanha mensal
- `/api/ai/sugestao-storyboard` — sugerir cenas para storyboard

---

## Segurança

- Chave nunca exposta ao cliente
- Rotas não requerem auth por padrão (adicionar se necessário)
- Rate limiting: considerar adicionar middleware para limitar chamadas por IP
- Custo: monitorar uso no dashboard OpenAI (platform.openai.com)
