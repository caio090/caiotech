-- ============================================================
-- SQL 33 — FinanceOS: cobranças, planos e clientes financeiros
--
-- Sem saldo interno. Sem saque. Sem depósito.
-- Supabase guarda registro, status e histórico.
-- Dinheiro real fica no gateway/banco.
--
-- Safe to re-run:
--   CREATE TABLE IF NOT EXISTS
--   ALTER TABLE ADD COLUMN IF NOT EXISTS
--   CREATE INDEX IF NOT EXISTS
--   DROP POLICY IF EXISTS + CREATE POLICY
--   CREATE OR REPLACE FUNCTION
-- ============================================================

-- ── 1. finance_plans: planos de cobrança por organização ─────

CREATE TABLE IF NOT EXISTS public.finance_plans (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES public.profiles(id) ON DELETE CASCADE, -- owner/org admin
  name            text        NOT NULL,
  description     text,
  price           numeric(10,2) NOT NULL DEFAULT 0,
  billing_cycle   text        NOT NULL DEFAULT 'monthly'
                              CHECK (billing_cycle IN ('monthly','quarterly','semiannual','annual','one_time')),
  active          boolean     NOT NULL DEFAULT true,
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 2. finance_charges: cobranças individuais ────────────────

CREATE TABLE IF NOT EXISTS public.finance_charges (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id           uuid        REFERENCES public.clients(id)  ON DELETE SET NULL,
  plan_id             uuid        REFERENCES public.finance_plans(id) ON DELETE SET NULL,
  -- Dados da cobrança
  description         text,
  amount              numeric(10,2) NOT NULL DEFAULT 0,
  due_date            date        NOT NULL,
  paid_at             timestamptz DEFAULT NULL,
  -- Status
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'draft','pending','paid','overdue',
                                    'canceled','refunded','manual_confirmed'
                                  )),
  payment_method      text        DEFAULT NULL,   -- pix, boleto, cartao, transferencia, dinheiro
  -- Gateway (preparação para integração futura)
  gateway_provider    text        DEFAULT NULL,   -- asaas, mercadopago, pagarme, stripe
  gateway_customer_id text        DEFAULT NULL,
  gateway_charge_id   text        DEFAULT NULL,
  payment_link        text        DEFAULT NULL,
  pix_qr_code         text        DEFAULT NULL,
  webhook_event_id    text        DEFAULT NULL,
  webhook_received_at timestamptz DEFAULT NULL,
  -- Metadados
  notes               text        DEFAULT NULL,
  attachment_url      text        DEFAULT NULL,   -- comprovante de pagamento
  metadata            jsonb       DEFAULT NULL,   -- raw gateway payload
  -- Auditoria
  created_by          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 3. finance_charge_history: log de mudanças de status ─────

CREATE TABLE IF NOT EXISTS public.finance_charge_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id     uuid        NOT NULL REFERENCES public.finance_charges(id) ON DELETE CASCADE,
  from_status   text,
  to_status     text        NOT NULL,
  changed_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Trigger: atualizar updated_at automaticamente ─────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_charges_updated_at    ON public.finance_charges;
DROP TRIGGER IF EXISTS trg_finance_plans_updated_at      ON public.finance_plans;

CREATE TRIGGER trg_finance_charges_updated_at
  BEFORE UPDATE ON public.finance_charges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_finance_plans_updated_at
  BEFORE UPDATE ON public.finance_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. Trigger: registrar histórico de mudança de status ─────

CREATE OR REPLACE FUNCTION public.log_finance_charge_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.finance_charge_history (charge_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_charge_status ON public.finance_charges;

CREATE TRIGGER trg_log_charge_status
  AFTER UPDATE OF status ON public.finance_charges
  FOR EACH ROW EXECUTE FUNCTION public.log_finance_charge_status_change();

-- ── 6. Trigger: auto-marcar overdue ──────────────────────────
-- Marcar automaticamente cobranças vencidas.
-- Executar via CRON ou chamar via função.

CREATE OR REPLACE FUNCTION public.finance_mark_overdue()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.finance_charges
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finance_mark_overdue() TO authenticated;

-- ── 7. RLS ────────────────────────────────────────────────────

ALTER TABLE public.finance_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_charges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_charge_history ENABLE ROW LEVEL SECURITY;

-- finance_plans: admin da organização vê/edita os próprios
DROP POLICY IF EXISTS "finance_plans: admin vê os próprios" ON public.finance_plans;
CREATE POLICY "finance_plans: admin vê os próprios"
  ON public.finance_plans FOR SELECT
  USING (
    organization_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "finance_plans: admin gerencia" ON public.finance_plans;
CREATE POLICY "finance_plans: admin gerencia"
  ON public.finance_plans FOR ALL
  USING (
    organization_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- finance_charges: admin vê todas; financeiro vê todas; cliente vê as suas
DROP POLICY IF EXISTS "finance_charges: admin e financeiro veem tudo" ON public.finance_charges;
CREATE POLICY "finance_charges: admin e financeiro veem tudo"
  ON public.finance_charges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','financeiro','operacional')
    )
  );

DROP POLICY IF EXISTS "finance_charges: cliente vê as suas" ON public.finance_charges;
CREATE POLICY "finance_charges: cliente vê as suas"
  ON public.finance_charges FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "finance_charges: admin e financeiro gerenciam" ON public.finance_charges;
CREATE POLICY "finance_charges: admin e financeiro gerenciam"
  ON public.finance_charges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','financeiro')
    )
  );

-- finance_charge_history: segue as permissões de charge
DROP POLICY IF EXISTS "finance_history: admin e financeiro veem" ON public.finance_charge_history;
CREATE POLICY "finance_history: admin e financeiro veem"
  ON public.finance_charge_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','financeiro','operacional')
    )
  );

-- ── 8. RPC: resumo financeiro para dashboard ─────────────────

CREATE OR REPLACE FUNCTION public.get_finance_summary()
RETURNS TABLE (
  total_received    numeric,
  total_pending     numeric,
  total_overdue     numeric,
  count_paid        bigint,
  count_pending     bigint,
  count_overdue     bigint,
  mrr               numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','financeiro')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN status IN ('paid','manual_confirmed') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE status IN ('paid','manual_confirmed')),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'overdue'),
    -- MRR: soma de cobranças paid ou pending do mês atual
    COALESCE(SUM(
      CASE WHEN status IN ('paid','manual_confirmed','pending')
        AND DATE_TRUNC('month', due_date) = DATE_TRUNC('month', CURRENT_DATE)
      THEN amount ELSE 0 END
    ), 0)
  FROM public.finance_charges;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_summary() TO authenticated;

-- ── 9. Índices ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_finance_charges_status
  ON public.finance_charges (status, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_charges_client
  ON public.finance_charges (client_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_charges_org
  ON public.finance_charges (organization_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_charges_due
  ON public.finance_charges (due_date)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_finance_history_charge
  ON public.finance_charge_history (charge_id, created_at DESC);

-- ── 10. Notificar PostgREST ───────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- INSTRUÇÕES
-- ============================================================
--
-- 1. Rodar este SQL no Supabase SQL Editor
-- 2. Para marcar cobranças vencidas manualmente:
--    SELECT finance_mark_overdue();
--    (Ideal: configurar como Scheduled Function no Supabase)
-- 3. Resumo financeiro:
--    supabase.rpc('get_finance_summary')
-- 4. Cobranças de um cliente:
--    supabase.from('finance_charges').select('*').eq('client_id', clientId)
-- ============================================================
