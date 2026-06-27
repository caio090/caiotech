# LOKAT OS — Leads, Conversas e Agente IA

## Visao geral

O modulo de Leads da LOKAT OS identifica, qualifica e acompanha oportunidades comerciais
de cada cliente, com suporte futuro de agente IA para follow-up e atendimento.

## Origem dos leads

- Instagram Direct
- WhatsApp
- Site / landing page
- Meta Ads (formulario de lead)
- Google
- Indicacao
- Manual (inserido pela equipe)

## Status do lead

- novo: acabou de entrar
- em_atendimento: sendo atendido
- aguardando_resposta: mensagem enviada, aguardando retorno
- no_vacuo: passou X horas sem resposta (alerta visual)
- qualificado: lead confirmado como oportunidade real
- perdido: nao converteu
- convertido: virou cliente

## Temperatura do lead

- quente: alto interesse, contato recente
- morno: interesse moderado, sem urgencia
- frio: sem resposta ou interesse baixo

## Lead no vacuo

Regra: se o lead ficar sem resposta por mais de X horas (configuravel), badge "No vacuo" aparece em vermelho.
Na V1: exibido visualmente com base em campo hoursWithoutReply.
Futuramente: calculado automaticamente via timestamp da ultima mensagem.

## Agente IA — modos

### Desativado (V1 atual)
- Nenhuma acao automatica
- Apenas exibicao de leads e alertas manuais

### Sugestoes apenas (proxima fase)
- Agente sugere mensagem de follow-up
- Humano aprova antes de enviar
- Registra temperatura e proxima acao

### Automatico (roadmap — plano superior)
- Agente responde automaticamente duvidas comuns
- Qualifica lead com perguntas programadas
- Avisa humano quando necessario
- Encaminha para closer
- Cria tarefa na LOKAT OS

## Integrações futuras

- WhatsApp Business API
- Instagram Direct API
- Meta Lead Ads (webhook de lead)
- Formularios proprios (landing LOKAT OS)
- Google Forms via Zapier/Make

## Seguranca

- Nenhuma resposta automatica sem ativacao explicita do admin
- Token de WhatsApp nunca exposto no frontend
- Lead vinculado a client_id — cliente so ve proprios leads
- Admin ve todos os leads de todos os clientes

## SQL necessario (futuro)

Quando leads reais forem implementados:
- docs/supabase/41-leads.sql (a criar)
- Tabela leads com: id, client_id, name, origin, status, temp, responsible, next_action, tags, campaign, created_at, last_contact_at
- RLS por client_id
