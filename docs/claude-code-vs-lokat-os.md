# Claude Code vs LOKAT OS — Quando usar cada um

## Resumo rápido

| Claude Code                         | LOKAT OS                              |
|-------------------------------------|---------------------------------------|
| Ferramenta de desenvolvimento       | Produto final para o usuário          |
| Cria e modifica código              | Executa o produto                     |
| Uso interno do time técnico         | Uso pelo cliente/agência/autônomo     |
| Acessa o sistema de arquivos        | Acessa o painel no navegador          |
| Cria rotas, componentes, SQL        | Usa as rotas já criadas               |
| Não fica disponível para o cliente  | É o que o cliente usa todos os dias   |

---

## Claude Code — para que serve

Claude Code é um assistente de desenvolvimento que roda localmente (terminal/IDE).
Ele é usado para **construir e manter a LOKAT OS**, não para operar o produto.

### Use Claude Code para:
- Criar novas páginas, rotas de API, componentes
- Corrigir bugs e erros de TypeScript
- Criar e versionar arquivos SQL (`docs/supabase/`)
- Testar integrações antes de subir para produção
- Auditar código, revisar lógica, refatorar
- Fazer diagnóstico técnico do projeto
- Criar migrations e ajustar estrutura do banco
- Atualizar variáveis de ambiente e configurações
- Gerar relatório técnico do estado do sistema

### Não use Claude Code para:
- Operar a plataforma no dia a dia
- Gerenciar clientes reais
- Aprovar conteúdos de campanha
- Gerar relatórios de desempenho para clientes
- Fazer login como usuário final

---

## LOKAT OS — para que serve

A LOKAT OS é o produto. É o painel que o cliente, a agência e o autônomo
acessam para operar o negócio deles.

### O cliente/agência usa a LOKAT OS para:
- Cadastrar e gerenciar clientes
- Planejar e aprovar conteúdos no ContentOS
- Organizar vídeos e produções no RecOS
- Acompanhar leads e pipeline no GrowthOS
- Controlar cobranças no FinanceOS
- Conectar Instagram, Meta, Google e Canva em Conexões
- Ver diagnósticos e relatórios
- Usar a IA para gerar briefings, legendas e estratégias

### O que a IA faz dentro da LOKAT OS:
- Lê a base operacional do cliente (`client_context`)
- Gera diagnóstico de marca
- Cria briefings personalizados
- Sugere legendas com o tom correto
- Gera roteiros para RecOS
- Sugere próximos conteúdos com base no histórico
- Aponta gargalos e oportunidades no painel

---

## Context Pack — ponte entre os dois mundos

O Context Pack é um conceito onde a LOKAT OS pode exportar um resumo
do cliente para ser usado em sessões avançadas do Claude Code.

Exemplo de uso:
1. A LOKAT OS gera o Context Pack do cliente X (via `resumo_estrategico`)
2. O time técnico usa esse pack em uma sessão do Claude Code para
   criar uma feature específica para aquele cliente
3. A feature vai para produção e o cliente passa a usar pelo painel

**Objetivo final:** a própria LOKAT OS executar cada vez mais operações
sem precisar do Claude Code. O Claude Code fica reservado para
desenvolvimento técnico, não para operação de negócio.

---

## Regras de segurança entre os dois

| Regra                                          | Claude Code    | LOKAT OS       |
|------------------------------------------------|----------------|----------------|
| Pode acessar .env.local                        | Sim (local)    | Nao            |
| Pode ver META_APP_SECRET                       | Sim (local)    | Nunca          |
| Pode rodar SQL no Supabase                     | Nao (arquivo)  | Nao (painel)   |
| Pode fazer git push                            | Com autorizacao| Nao            |
| Pode criar/deletar usuarios                    | Via admin      | Via painel     |
| Dados de clientes reais                        | Nao acessar    | Uso normal     |

---

## Fluxo de desenvolvimento

```
Ideia/Bug
   ↓
Claude Code (desenvolvimento local)
   ↓
npm run build (verificação)
   ↓
git commit + git push (com autorização)
   ↓
Vercel (deploy automático)
   ↓
LOKAT OS (cliente usa o produto)
```

O cliente nunca toca no código. O Claude Code nunca toca nos dados reais.
