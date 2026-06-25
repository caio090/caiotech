-- ============================================================
-- SQL 27 — Fix trigger aprovação automática + índices
--
-- Corrige:
--   1. Comparação de boolean JSONB (era IS DISTINCT FROM 'true',
--      agora usa cast explícito ::boolean)
--   2. Adiciona RAISE NOTICE para debug
--   3. Adiciona handler de erro com RAISE WARNING (não quebra transação)
--   4. Popula created_by via auth.uid()
--   5. Índice composto (approval_id, status) em operational_tasks
--
-- Safe to re-run (OR REPLACE + IF NOT EXISTS).
-- ============================================================

-- ── 1. Re-criar função com correções ─────────────────────────

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
  v_enabled boolean;
BEGIN
  -- Só dispara quando muda PARA 'aprovado'
  IF NEW.status IS DISTINCT FROM 'aprovado'
     OR OLD.status = 'aprovado' THEN
    RETURN NEW;
  END IF;

  RAISE NOTICE '[auto_create_task] approval % → aprovado', NEW.id;

  -- Buscar content_item
  SELECT * INTO v_content
    FROM public.content_items
   WHERE id = NEW.content_id;

  IF NOT FOUND THEN
    RAISE WARNING '[auto_create_task] content_item % não encontrado', NEW.content_id;
    RETURN NEW;
  END IF;

  -- Ler configuração de produção pós-aprovação
  v_prod := v_content.metadata -> 'production_after_approval';

  -- Verificar se enabled — cast explícito para boolean (suporta tanto
  -- JSON boolean true quanto string 'true')
  BEGIN
    v_enabled := (v_prod ->> 'enabled')::boolean;
  EXCEPTION WHEN OTHERS THEN
    v_enabled := false;
  END;

  IF v_prod IS NULL OR v_enabled IS NOT TRUE THEN
    RAISE NOTICE '[auto_create_task] production_after_approval não habilitado para content %', v_content.id;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[auto_create_task] criando tarefa para content % | dept=% | role=%',
    v_content.id,
    v_prod ->> 'department',
    v_prod ->> 'assigned_role';

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
  BEGIN
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
      brief,
      created_by
    ) VALUES (
      COALESCE(NEW.client_id, v_content.client_id),
      v_content.id,
      NEW.id,
      v_title,
      v_content.caption,
      COALESCE(v_prod ->> 'task_type',     'arte'),
      COALESCE(v_prod ->> 'department',    'design'),
      COALESCE(v_prod ->> 'assigned_role', 'designer'),
      'briefing',
      COALESCE(v_prod ->> 'priority',      'media'),
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
      ),
      auth.uid()
    )
    RETURNING id INTO v_task_id;

    RAISE NOTICE '[auto_create_task] ✓ tarefa % criada para approval %', v_task_id, NEW.id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[auto_create_task] ERRO ao criar tarefa para approval %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;

  -- Atualizar content_item para em_producao
  BEGIN
    UPDATE public.content_items
       SET status = 'em_producao'
     WHERE id = v_content.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[auto_create_task] ERRO ao atualizar content_item %: %', v_content.id, SQLERRM;
  END;

  -- Salvar task_id na metadata da approval para referência no frontend
  IF v_task_id IS NOT NULL THEN
    BEGIN
      UPDATE public.approvals
         SET metadata = COALESCE(metadata, '{}'::jsonb)
                     || jsonb_build_object('operational_task_id', v_task_id::text)
       WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[auto_create_task] ERRO ao atualizar metadata da approval %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. Recriar trigger ────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_auto_create_task_on_approval ON public.approvals;

CREATE TRIGGER trg_auto_create_task_on_approval
  AFTER UPDATE OF status ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_task_on_approval();

-- ── 3. Índice composto para busca por approval_id + status ────

CREATE INDEX IF NOT EXISTS idx_operational_tasks_approval_status
  ON public.operational_tasks (approval_id, status)
  WHERE approval_id IS NOT NULL;

-- ── 4. Índice em content_items.metadata para production_after_approval ──

CREATE INDEX IF NOT EXISTS idx_content_items_prod_after_approval
  ON public.content_items USING GIN (metadata)
  WHERE (metadata -> 'production_after_approval') IS NOT NULL;

-- ── 5. Notificar PostgREST ────────────────────────────────────

NOTIFY pgrst, 'reload schema';
