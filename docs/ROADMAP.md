# Roadmap

Roadmap operacional do Lokat OS.

## Próximo passo imediato

- Verificar se SUPABASE_SERVICE_ROLE_KEY na Vercel aponta para o mesmo projeto que NEXT_PUBLIC_SUPABASE_URL (causa mais provável do admin waitlist retornar 0).
- Descobrir tabela base do admin_signups_view: rodar `SELECT pg_get_viewdef('public.admin_signups_view', true)` no SQL Editor.
- Testar landing reformulada: hero CTAs, modal de conversa, seções O Problema / Para quem / FAQ, prévia visual.

## Pendências técnicas confirmadas (2026-07-06)

- Waitlist: POST deve funcionar com SQL 75 aplicado. Se ainda falhar, verificar chave Vercel.
- Admin waitlist (0 registros): causa mais provável é service role key incorreta ou apontando para projeto errado.
- Central de Leads (/admin/super/leads): criada. Mostra launch_waitlist + admin_signups_view.
- admin_signups_view: fonte legada somente leitura até identificar tabela base.
- Modelo multi-tenant: definido em docs/DATA_MODEL_MULTI_TENANT_ARCHITECTURE.md. Não migrar ainda.
- Landing: reformulada com O Problema, FAQ, Para quem, prévia visual, modal de conversa, 3 CTAs no hero.

## Pendencias de organizacao

- Preencher objetivos atuais do produto.
- Registrar prioridades de curto prazo.
- Registrar pendencias tecnicas confirmadas.
- Registrar decisoes arquiteturais somente quando validadas.

## Regras

- Nao usar este arquivo para inventar escopo.
- Atualizar conforme decisoes reais forem tomadas.
