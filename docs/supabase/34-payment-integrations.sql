-- SQL 34 — Tabela payment_integrations
-- Registra configurações de gateway por organização.
-- Para MVP: a Lokat usa ASAAS_API_KEY na Vercel (não salva chave aqui).
-- Para fase 2+: cada organização pode conectar próprio gateway.
-- NUNCA salvar API keys em texto puro — usar apenas referência/status.
-- Rodar no Supabase SQL Editor.

-- ── Tabela ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_integrations (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider              text NOT NULL,                      -- asaas | mercadopago | pagarme | stripe
  status                text NOT NULL DEFAULT 'pending',   -- pending | active | inactive | error
  environment           text NOT NULL DEFAULT 'sandbox',   -- sandbox | production
  gateway_account_id    text,                              -- ID da conta no gateway (não a chave)
  webhook_url           text,                              -- URL configurada no painel do gateway
  metadata              jsonb DEFAULT '{}'::jsonb,
  connected_at          timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),

  CONSTRAINT payment_integrations_provider_check CHECK (
    provider IN ('asaas', 'mercadopago', 'pagarme', 'stripe')
  ),
  CONSTRAINT payment_integrations_status_check CHECK (
    status IN ('pending', 'active', 'inactive', 'error')
  ),
  CONSTRAINT payment_integrations_env_check CHECK (
    environment IN ('sandbox', 'production')
  ),
  CONSTRAINT payment_integrations_unique_org_provider UNIQUE (organization_id, provider)
);

COMMENT ON TABLE public.payment_integrations IS
  'Configurações de gateway de pagamento por organização. Não armazena API keys — apenas referências e status.';

-- ── Trigger updated_at ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_payment_integration_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_integrations_updated_at ON public.payment_integrations;
CREATE TRIGGER trg_payment_integrations_updated_at
  BEFORE UPDATE ON public.payment_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_payment_integration_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.payment_integrations ENABLE ROW LEVEL SECURITY;

-- Admin vê e edita as integrações da própria organização
CREATE POLICY "Admin manage own integrations"
  ON public.payment_integrations
  FOR ALL
  USING (
    auth.uid() = organization_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'lokat')
    )
  );

-- ── RPC: get_my_gateway_status ────────────────────────────────────────────────
-- Retorna o status da integração de gateway da organização do usuário logado.
-- Nunca retorna chaves.
CREATE OR REPLACE FUNCTION public.get_my_gateway_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_result jsonb;
BEGIN
  v_org_id := auth.uid();

  SELECT jsonb_build_object(
    'provider',            pi.provider,
    'status',              pi.status,
    'environment',         pi.environment,
    'gateway_account_id',  pi.gateway_account_id,
    'connected_at',        pi.connected_at
  )
  INTO v_result
  FROM public.payment_integrations pi
  WHERE pi.organization_id = v_org_id
    AND pi.status = 'active'
  ORDER BY pi.connected_at DESC
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('configured', false, 'provider', null);
  END IF;

  RETURN v_result || jsonb_build_object('configured', true);
END;
$$;
