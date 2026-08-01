# Padrão de QA local — Sprint Recovery 2.1.3

## Por que este documento existe

Sprints anteriores usaram portas diferentes para QA local (3000, 3100,
3002, 3101...), o que fez relatórios apontarem para URLs inconsistentes e
dificultou saber se um servidor local pertencia à branch/HEAD certos. Este
documento fixa um padrão único, com scripts que o aplicam automaticamente.

## As três portas oficiais

| Porta | Uso | URL |
|---|---|---|
| **3100** | QA local oficial, `next dev` | `http://127.0.0.1:3100` |
| **3200** | Production local, `next start` (build já gerado) | `http://127.0.0.1:3200` |
| **3000** | Desenvolvimento livre — **nunca** citado como QA oficial | `http://127.0.0.1:3000` |

Fonte única da verdade: `src/config/local-qa.ts` (`LOCAL_QA_CONFIG`).
Nenhum script ou documento redigita esses valores separadamente.

## Como iniciar

```
npm run dev:qa      # sobe next dev na porta 3100
npm run start:qa    # sobe next start na porta 3200 (requer build prévio)
```

Ambos passam por `scripts/qa-dev-launcher.ts`, que:

1. sobe o processo real do Next como filho;
2. registra branch, HEAD, PID, porta, modo e horário em
   `.tmp/local-qa-session.json` (nunca commitado — já coberto por
   `.gitignore`);
3. espelha stdout/stderr para `.tmp/lokat-os-qa-3100.log` (ou
   `lokat-os-qa-<porta>.log` para outras portas);
4. atualiza o status da sessão para `"ready"` assim que o Next imprime
   "Ready" — nunca antes disso.

O arquivo de sessão nunca contém segredo, cookie, token, e-mail ou
credencial — só metadados de processo e git.

## Como verificar

```
npm run qa:info       # mostra projeto/branch/HEAD/porta/URL/working tree
npm run qa:doctor      # valida ponta a ponta: git, sessão, PID vivo, rotas
npm run qa:smoke       # smoke test das rotas principais, PASS/FAIL
```

`qa:doctor` nunca mata um processo — se o PID registrado não existe mais,
ele marca a sessão como obsoleta ("stale") e recomenda reiniciar, mas não
age sozinho. Se a sessão registrada pertence a uma branch/HEAD diferente
da atual, ele avisa em vez de presumir que está tudo certo.

## Porta ocupada

Se a porta 3100 já estiver em uso ao rodar `dev:qa`:

1. Identificar o processo (`netstat -ano | grep :3100` no Windows).
2. Rodar `npm run qa:info` para ver se já existe uma sessão registrada
   pertencendo a este mesmo projeto/branch/HEAD.
3. Se pertencer ao processo correto: reutilizar, não subir um segundo.
4. Se for um processo desconhecido: **parar e relatar**
   `BLOCKER_QA_PORT_3100_OCCUPIED` — nunca usar 3101 como fallback
   automático, nunca matar processo desconhecido.

## Como o Codex Web deve acessar

Sempre `http://127.0.0.1:3100` durante QA autenticado local — nunca 3000,
nunca uma porta improvisada. Antes de começar, confirmar via `qa:doctor`
que a sessão pertence à branch/HEAD esperados para o QA em questão.

## Como encerrar

Encerrar apenas um processo **confirmadamente correto** (mesma branch,
mesmo projeto, PID vivo confirmado por `qa:info`/`qa:doctor`). Nunca matar
um processo desconhecido só porque está na porta 3100.
