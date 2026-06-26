# ContentOS — Regras de Base por Cliente

## O que é o "contexto de base" de um cliente

Antes de gerar conteúdo, a ContentOS precisa de um contexto estratégico do cliente. Esse contexto vive em duas tabelas:

| Tabela | O que armazena | SQL |
|---|---|---|
| `client_context` | Briefing estratégico: segmento, tom de voz, público-alvo, produtos, metas | SQL 36 |
| `onboarding_profiles` | Dados de onboarding: nome, empresa, Instagram, site | Existente |

## Gate de diagnóstico

Ao entrar no workspace ContentOS de um cliente (`/admin/contentos/home?client=XXX`), o sistema verifica se existe um registro em `client_context`:

- **Existe** → entra direto
- **Não existe** → exibe banner de aviso com opção de preencher ou continuar

O banner (`BriefGate`) é dismissível — o admin pode continuar sem diagnóstico, mas a qualidade das sugestões da IA será menor.

## O que NÃO deve acontecer

- Bloquear acesso à ContentOS por falta de diagnóstico (apenas avisa, não redireciona)
- Fazer chamadas à IA com contexto vazio (a rota de sugestões lida com isso graciosamente)
- Criar `client_context` automaticamente sem input do usuário

## Fluxo recomendado ao onboarding de um cliente

1. Criar o cliente em `/admin/clientes`
2. Preencher o diagnóstico (vai criar `client_context`)
3. Vincular ativos Meta se houver (via `/admin/conexoes` → `client_meta_assets`)
4. Entrar na ContentOS — sugestões de conteúdo já terão contexto

## Segmentos típicos para filtros

Os segmentos vêm da tabela `clients.segment` (texto livre). Filtros comuns no painel:
- Gastronomia, Saúde, Moda, Educação, Tecnologia, Serviços, E-commerce

## RLS e acesso

- `client_context` é visível por `admin`, `agency` e `team`
- Inserção e atualização: apenas `admin` e `agency`
- `onboarding_profiles`: mesmo padrão
