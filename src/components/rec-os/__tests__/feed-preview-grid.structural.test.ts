/**
 * Executar com: node .tmp/run-ts-test.cjs src/components/rec-os/__tests__/feed-preview-grid.structural.test.ts
 * Prompt 13 (REC OS Core Experience) — buildFeedGridItems é pura, sem
 * React, sem I/O.
 */
import { buildFeedGridItems } from "../feed-preview-grid";
import type { FeedTemporalContext, FeedTimelineItem } from "@/lib/rec-os/social-profile/feed-timeline";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function item(id: string, status: FeedTimelineItem["status"], occurredAt: string | null = null): FeedTimelineItem {
  return { id, status, thumbnailUrl: null, label: id, occurredAt };
}

async function main() {
  console.log("[test] contexto totalmente vazio -- sempre preenche até gridSize com future_slot, nunca menos células");
  {
    const ctx: FeedTemporalContext = { published: [], planned: [], inCreation: [], limitation: null };
    const grid6 = buildFeedGridItems(ctx, 6, "now");
    const grid9 = buildFeedGridItems(ctx, 9, "now");
    assert(grid6.length === 6, "6 células mesmo sem nenhum dado real");
    assert(grid9.length === 9, "9 células mesmo sem nenhum dado real");
    assert(grid6.every((i) => i.status === "future_slot"), "todas future_slot quando não há nada");
  }

  console.log("[test] published ordenado por mais recente primeiro (como o Instagram real)");
  {
    const ctx: FeedTemporalContext = {
      published: [item("old", "published", "2026-01-01T00:00:00Z"), item("new", "published", "2026-03-01T00:00:00Z"), item("mid", "published", "2026-02-01T00:00:00Z")],
      planned: [], inCreation: [], limitation: null,
    };
    const grid = buildFeedGridItems(ctx, 6, "now");
    assert(grid[0].id === "new", "mais recente ocupa a primeira posição");
    assert(grid[1].id === "mid", "segunda posição é a próxima mais recente");
    assert(grid[2].id === "old", "terceira posição é a mais antiga");
    assert(grid[3].status === "future_slot", "resto preenchido com future_slot");
  }

  console.log("[test] mode 'now' -- nunca inclui inCreation, mesmo que exista");
  {
    const ctx: FeedTemporalContext = { published: [item("p1", "published", "2026-01-01T00:00:00Z")], planned: [], inCreation: [item("draft", "in_creation")], limitation: null };
    const grid = buildFeedGridItems(ctx, 6, "now");
    assert(!grid.some((i) => i.id === "draft"), "modo 'now' nunca mostra a peça em criação -- só o feed atual real");
  }

  console.log("[test] mode 'with_new_piece' -- peça em criação ocupa o PRÓXIMO slot (início da grade, Fase 18)");
  {
    const ctx: FeedTemporalContext = { published: [item("p1", "published", "2026-01-01T00:00:00Z")], planned: [], inCreation: [item("draft", "in_creation")], limitation: null };
    const grid = buildFeedGridItems(ctx, 6, "with_new_piece");
    assert(grid[0].id === "draft", "peça em criação entra no início, como uma nova publicação entraria no Instagram real");
    assert(grid[1].id === "p1", "publicações existentes são empurradas, nunca substituídas/perdidas");
  }

  console.log("[test] mais itens do que o grid comporta -- trunca, nunca extrapola gridSize");
  {
    const published = Array.from({ length: 12 }, (_, i) => item(`p${i}`, "published", `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`));
    const ctx: FeedTemporalContext = { published, planned: [], inCreation: [], limitation: null };
    const grid = buildFeedGridItems(ctx, 9, "now");
    assert(grid.length === 9, "nunca mais que gridSize células, mesmo com mais dado disponível");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
