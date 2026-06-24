-- ============================================================
-- SQL 24 — Approval Auto-Production Trigger
-- Quando cliente aprova, cria operational_task automaticamente
-- com os dados de setor salvos em content_items.metadata.
--
-- Também adiciona metadata jsonb na tabela approvals para
-- guardar contexto de aprovação pós-criação.
--
-- Safe to re-run (IF NOT EXISTS + OR REPLACE guards).
-- ============================================================

-- ── 1. metadata em approvals ──────────────────────────────────

ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_approvals_metadata
  ON public.approvals USING GIN (metadata)
  WHERE metadata IS NOT NULL;

-- ── 2. Função trigger ─────────────────────────────────────────
--
-- Dispara quando approvals.status muda para 'aprovado'.
-- Lê content_items.metadata -> 'production_after_approval'.
-- Se enabled = true, cria operational_task e atualiza status
-- do content_item para 'em_producao'.
--
-- SECURITY DEFINER: executa com permissões do criador,
-- contornando RLS para inserção no operacional.

CREATE OR REPLACE FUNCTION public.auto_create_task_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content public.content_items%ROWTYPE;
  v_prod    jsonb;
  v_title   text;
  v_due     date;
  v_pages   int;
  v_task_id uuid;
BEGIN
  -- Só dispara quando muda PARA 'aprovado'
  IF NEW.status IS DISTINCT FROM 'aprovado'
     OR OLD.status = 'aprovado' THEN
    RETURN NEW;
  END IF;

  -- Buscar content_item
  SELECT * INTO v_content
    FROM public.content_items
   WHERE id = NEW.content_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Ler configuração de produção pós-aprovação
  v_prod := v_content.metadata -> 'production_after_approval';

  -- Se não configurado ou desabilitado, sair sem criar tarefa
  IF v_prod IS NULL
     OR (v_prod ->> 'enabled') IS DISTINCT FROM 'true' THEN
    RETURN NEW;
  END IF;

  v_title := COALESCE(v_content.title, 'Conteúdo aprovado pelo cliente');
  v_pages := v_content.carousel_pages_count;

  -- Parse de due_date com fallback seguro
  BEGIN
    IF v_prod ->> 'due_date' IS NOT NULL AND v_prod ->> 'due_date' != '' THEN
      v_due := (v_prod ->> 'due_date')::date;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_due := NULL;
  END;

  -- Criar operational_task
  INSERT INTO public.operational_tasks (
    client_id,
    content_item_id,
    approval_id,
    title,
    description,
    task_type,
    department,
    assigned_role,
    status,
    priority,
    due_date,
    internal_notes,
    channel,
    format,
    carousel_pages_count,
    brief
  ) VALUES (
    COALESCE(NEW.client_id, v_content.client_id),
    v_content.id,
    NEW.id,
    v_title,
    v_content.caption,
    COALESCE(v_prod ->> 'task_type',      'arte'),
    COALESCE(v_prod ->> 'department',     'design'),
    COALESCE(v_prod ->> 'assigned_role',  'designer'),
    'briefing',
    COALESCE(v_prod ->> 'priority',       'media'),
    v_due,
    v_prod ->> 'internal_notes',
    v_content.channel,
    v_content.type,
    v_pages,
    jsonb_build_object(
      'tipo',                  COALESCE(v_content.type, ''),
      'canais',                COALESCE(v_content.channel, ''),
      'legenda',               COALESCE(v_content.caption, ''),
      'is_hybrid',             COALESCE((v_content.metadata ->> 'is_hybrid')::boolean, false),
      'formats',               COALESCE(v_content.metadata -> 'formats', '[]'::jsonb),
      'required_assets',       COALESCE(
                                 v_content.metadata -> 'formats',
                                 jsonb_build_array(COALESCE(v_content.type, 'arte'))
                               ),
      'carousel_pages_count',  COALESCE(v_pages, 1),
      'visual_structure',      COALESCE(v_content.metadata -> 'visual_structure', '{}'::jsonb),
      'aprovado_pelo_cliente', true,
      'approval_id',           NEW.id::text
    )
  )
  RETURNING id INTO v_task_id;

  -- Atualizar content_item para em_producao
  UPDATE public.content_items
     SET status = 'em_producao'
   WHERE id = v_content.id;

  -- Salvar task_id na metadata da approval para referência
  IF v_task_id IS NOT NULL THEN
    UPDATE public.approvals
       SET metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object('operational_task_id', v_task_id::text)
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Criar trigger ──────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_auto_create_task_on_approval ON public.approvals;

CREATE TRIGGER trg_auto_create_task_on_approval
  AFTER UPDATE OF status ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_task_on_approval();

-- ── 4. Notificar PostgREST ─────────────────────────────────────

NOTIFY pgrst, 'reload schema';
