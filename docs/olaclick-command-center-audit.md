# Auditoria OlaClick para o Centro de Comando

Data: 2026-07-28. Escopo: leitura do repositório, sem chamada ao provider, sem login externo e sem exibir variáveis.

## Conclusão

Existe integração real, server-side e persistida em `olaclick_connections`. Ela usa rotas internas em `src/app/api/olaclick`, o adapter em `src/lib/digital-menu/providers/olaclick.ts` e o resolvedor em `src/lib/digital-menu/server.ts`. Não foi encontrada dependência do n8n no caminho ativo auditado.

A integração consulta a API pública configurada para o provider e mantém token somente no servidor/banco. As respostas de listagem mascaram o token. A disponibilidade runtime e a existência de chave para uma empresa específica não foram testadas nesta sprint; portanto o Centro de Comando não exibe “Conectado”.

## Capacidades encontradas

| Recurso | Implementação | Estado desta auditoria |
|---|---|---|
| Pedidos e itens | `/api/olaclick/orders` | Implementado; runtime não testado |
| Produtos vendidos | `/api/olaclick/products-sold` | Implementado; runtime não testado |
| Pagamentos, descontos, taxas, serviços e origem | Métricas derivadas de pedidos | Implementado; cobertura depende da resposta |
| Cancelamentos | Derivado do status do pedido | Disponível quando retornado |
| Cardápio/menu | `/api/olaclick/menu` | Endpoint oficial ainda marcado como TODO no código |
| Categorias e modificadores | Sem adapter confirmado | Não implementado |
| Reembolsos | Sem adapter confirmado | Não implementado |
| Relatório | `/admin/relatorios/faturamento` | Implementado |

## Segurança e operação

- API key/token não é enviado ao Centro de Comando nem exposto pela rota de conexões.
- As consultas externas ocorrem no servidor e são de leitura.
- Há cache, deduplicação por pedido, paginação defensiva, timeout e diagnóstico de completude.
- Existe persistência de conexão e snapshots/estado de sincronização já implementados no projeto; esta sprint não gravou dados.
- O risco de duplicação é tratado na rota de pedidos, mas deve continuar coberto por QA runtime.
- Variáveis e valores não foram impressos ou inspecionados.
- Ambiente local possui configuração do aplicativo, mas a conexão de uma empresa não foi acionada.

## Próximas ações manuais

1. Executar QA autenticado da conexão já existente, sem criar conexão nova.
2. Confirmar capacidades e cobertura retornadas pelo provider.
3. Confirmar oficialmente o endpoint de menu antes de habilitar produtos/categorias como integrados.
4. Só trocar estados de “não testado” para “disponível” após evidência runtime.
