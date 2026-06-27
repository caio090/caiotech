# LOKAT OS — Integração Cardápio Digital / OlaClick

## O que é

A integração com plataformas de cardápio digital (como OlaClick) conecta o sistema de pedidos e
produtos do cliente diretamente na LOKAT OS, permitindo que marketing, conteúdo e financeiro
usem dados reais do negócio.

## Scopes utilizados na V1 (somente leitura)

- menu:read — leitura do cardápio e categorias
- orders:read — leitura de pedidos
- clients:read — leitura de clientes/compradores
- companies:read — dados da empresa conectada

Scopes NÃO usados na V1:
- menu:write — alteração de cardápio (bloqueado)
- webhooks:write — eventos automáticos (bloqueado)

## Como gerar token no OlaClick

1. Acesse o painel OlaClick
2. Va em Integracoes
3. Clique em API Keys
4. Clique em Gerar novo token
5. Marque as permissoes de leitura: menu:read, orders:read, clients:read, companies:read
6. Copie o token gerado
7. Cole na LOKAT OS em Conexoes > Cardapio Digital
8. Clique em Salvar conexao

## Seguranca

- O access_token e salvo no banco (tabela olaclick_connections)
- Nunca e retornado em APIs ou exibido no frontend
- Apenas token_last_four (ultimos 4 chars) e exibido na UI
- Se o token aparecer em print ou conversa, revogue e gere outro
- RLS ativado: cliente nao acessa access_token; admin/agency gerencia
- View v_olaclick_connections_safe remove o access_token das queries de cliente

## SQL necessario

Rodar manualmente: docs/supabase/39-olaclick-connections.sql

## Como a integracao alimenta outros modulos

### ContentOS
- Produtos mais vendidos -> sugerir campanhas de reforco
- Produtos com baixa venda -> sugerir campanha promocional
- Horario de pico de pedidos -> sugerir horario ideal de postagem
- Lancamento de produto -> sugerir conteudo de divulgacao

### Financeiro
- Volume de pedidos por periodo
- Ticket medio
- Faturamento estimado
- Comparativo semana a semana

### Leads
- Clientes recorrentes que podem virar embaixadores
- Clientes inativos que podem receber campanha de reativacao

### Relatorios
- Performance de campanhas x aumento de pedidos
- Produto promovido x pedidos no periodo

## Proximos passos

- Confirmar endpoints reais da API OlaClick (orders, menu, clients, companies)
- Ativar OLACLICK_API_BASE_URL na Vercel quando disponivel
- Implementar sincronizacao automatica via cron ou webhook
- Exibir produtos no ContentOS como fonte de ideias
- Exibir faturamento no FinanceOS
