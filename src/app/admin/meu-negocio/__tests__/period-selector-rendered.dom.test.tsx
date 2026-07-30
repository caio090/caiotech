/**
 * Correção definitiva (rodada "CONECTAR A INTERFACE REAL AO MODELO DE
 * PERÍODO"): os testes anteriores de PeriodSelector (period-selector-bugfix.
 * structural.test.ts) liam o arquivo-fonte como texto e nunca montavam o
 * componente real -- nunca provaram que um clique real dispara o handler
 * real, nem que o callback real recebe os argumentos certos. Este arquivo
 * monta o componente de verdade em jsdom (via @testing-library/react) e
 * dirige eventos reais (fireEvent), exatamente o caminho renderizado que o
 * Codex Web exercita num navegador.
 *
 * Executar com: node .tmp/run-tsx-dom-test.cjs <este arquivo>
 * (harness local que registra jsdom + transpila .tsx com JSX automático;
 * não é commitado, igual ao .tmp/run-ts-test.cjs já usado pelas suítes .ts.)
 */
import * as React from "react";
import { act } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PeriodSelector } from "../_period-selector";
import { buildPeriodSelection } from "@/lib/business-period/calculations";
import type { BusinessPeriodSelection } from "@/lib/business-period/types";

const TZ = "America/Fortaleza";
const OP_START = "04:00";
const NOW = new Date("2026-07-20T12:00:00-03:00");

let passed = 0;
let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function Harness({ initialPreset = "THIS_MONTH", managerMode = true, onSelectionChange }: { initialPreset?: BusinessPeriodSelection["preset"]; managerMode?: boolean; onSelectionChange?: (s: BusinessPeriodSelection) => void }) {
  const [selection, setSelection] = React.useState<BusinessPeriodSelection>(() => buildPeriodSelection(initialPreset, TZ, OP_START, NOW));
  return (
    <PeriodSelector
      selection={selection}
      onChange={(next) => { setSelection(next); onSelectionChange?.(next); }}
      timezone={TZ}
      operationalDayStart={OP_START}
      managerMode={managerMode}
    />
  );
}

function openPopover() {
  fireEvent.click(screen.getAllByRole("button")[0]);
}

// Array em vez de `let x: T | null` capturado por closure -- evita
// armadilhas de estreitamento de tipo do TypeScript através de closures e
// deixa `calls[0]` com o tipo concreto `BusinessPeriodSelection` (não
// `T | null`) em todos os pontos de uso abaixo.
function captureSelectionChanges() {
  const calls: BusinessPeriodSelection[] = [];
  return { calls, onSelectionChange: (s: BusinessPeriodSelection) => { calls.push(s); } };
}

async function run() {
  console.log("\n[dom] VALIDAÇÃO -- início vazio bloqueia Aplicar e não chama callback");
  {
    let called = false;
    render(<Harness onSelectionChange={() => { called = true; }} />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "" } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-07-15" } }); });
    const apply = screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement;
    assert(apply.disabled, "Aplicar desabilitado com data inicial vazia");
    assert(screen.getByRole("alert").textContent === "Informe a data inicial.", "mensagem exata para início vazio");
    assert(screen.getByLabelText("Data inicial").getAttribute("aria-invalid") === "true" && screen.getByLabelText("Data final").getAttribute("aria-invalid") === "false", "campo vazio específico é marcado inválido, o outro campo (preenchido) não");
    await act(async () => { fireEvent.click(apply); });
    assert(!called, "callback não chamado com início vazio");
    cleanup();
  }

  console.log("\n[dom] VALIDAÇÃO -- fim vazio bloqueia Aplicar");
  {
    render(<Harness />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "" } }); });
    assert((screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement).disabled, "Aplicar desabilitado com data final vazia");
    assert(screen.getByRole("alert").textContent === "Informe a data final.", "mensagem exata para fim vazio");
    cleanup();
  }

  console.log("\n[dom] VALIDAÇÃO -- início posterior ao fim (20/07 -> 10/07, exemplo exato do QA)");
  {
    let called = false;
    render(<Harness onSelectionChange={() => { called = true; }} />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-07-20" } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-07-10" } }); });
    const startInput = screen.getByLabelText("Data inicial");
    const endInput = screen.getByLabelText("Data final");
    const apply = screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement;
    assert(apply.disabled, "Aplicar desabilitado (disabled real, não só aria-disabled) com 20/07 > 10/07");
    assert(apply.getAttribute("aria-disabled") === "true", "aria-disabled reflete o mesmo estado");
    assert(startInput.getAttribute("aria-invalid") === "true" && endInput.getAttribute("aria-invalid") === "true", "erro de ORDEM (não de campo vazio/malformado) marca os dois campos como inválidos -- a data em si é válida, o problema é a relação entre elas");
    assert(startInput.getAttribute("aria-describedby") === "period-custom-error", "aria-describedby liga o campo à mensagem");
    assert(screen.getByRole("alert").textContent === "A data inicial não pode ser posterior à data final.", "mensagem exata do brief");
    // Enter dentro do <form> não deve aplicar (cobre submit programático, não só o clique no botão)
    await act(async () => { fireEvent.submit(startInput.closest("form")!); });
    assert(!called, "submit do form (Enter) não aplica nem chama o callback quando inválido");
    cleanup();
  }

  console.log("\n[dom] APLICAÇÃO -- 01/07 a 15/07 (exemplo exato do brief)");
  {
    const { calls, onSelectionChange } = captureSelectionChanges();
    render(<Harness onSelectionChange={onSelectionChange} />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-07-01" } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-07-15" } }); });
    const apply = screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement;
    assert(!apply.disabled, "Aplicar habilitado com 01/07 <= 15/07");
    await act(async () => { fireEvent.click(apply); });
    assert(calls.length === 1, "callback onChange chamado exatamente uma vez ao aplicar intervalo válido");
    const received = calls[0];
    assert(received.preset === "CUSTOM" && received.isCustom === true, "preset=CUSTOM e isCustom=true no objeto recebido pelo callback");
    assert(received.startDate === "2026-07-01", "callback recebe startDate exato");
    assert(received.endDateExclusive === "2026-07-16", "callback recebe endDateExclusive=16/07 (fim exclusivo, +1 dia do inclusivo digitado)");
    assert(received.label === "01/07/2026 a 15/07/2026", "label do objeto recebido mostra as datas reais");
    assert(received.comparisonLabel === "16/06/2026 até 30/06/2026", "comparisonLabel do objeto recebido é o exemplo exato do brief");
    assert(received.timezone === TZ && received.operationalDayStart === OP_START, "callback também transporta timezone e operationalDayStart (Fase 2)");
    cleanup();
  }

  console.log("\n[dom] REABERTURA -- não reverte para o mês cheio (bug relatado pelo QA)");
  {
    render(<Harness />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-07-01" } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-07-15" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Aplicar" })); });
    // reabrir
    await act(async () => { openPopover(); });
    const reopenedStart = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const reopenedEnd = screen.getByLabelText("Data final") as HTMLInputElement;
    assert(reopenedStart.value === "2026-07-01", "campo Data inicial reaberto = 2026-07-01");
    assert(reopenedEnd.value === "2026-07-15", "campo Data final reaberto = 2026-07-15 (NÃO 2026-07-31)");
    assert(screen.getByText("01/07/2026 a 15/07/2026", { exact: false }) !== null, "trigger mostra o rótulo do período aplicado, não o preset genérico");
    cleanup();
  }

  console.log("\n[dom] CANCELAR -- descarta o rascunho e preserva o período anterior");
  {
    let callCount = 0;
    render(<Harness onSelectionChange={() => { callCount++; }} />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-07-01" } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-07-15" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Cancelar" })); });
    assert(callCount === 0, "Cancelar não chama onChange");
    assert(screen.queryByLabelText("Data inicial") === null, "popover fecha ao cancelar");
    await act(async () => { openPopover(); });
    const start = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const originalThisMonthStart = buildPeriodSelection("THIS_MONTH", TZ, OP_START, NOW).startDate;
    assert(start.value === originalThisMonthStart, "reabrir após Cancelar mostra o período central original (mês corrente), não o rascunho descartado");
    cleanup();
  }

  console.log("\n[dom] CASOS DE BORDA -- um único dia, fevereiro, virada de mês/ano");
  {
    render(<Harness />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-07-10" } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-07-10" } }); });
    assert(!(screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement).disabled, "início == fim (um único dia) é aceito como intervalo válido");
    cleanup();
  }
  {
    const { calls, onSelectionChange } = captureSelectionChanges();
    render(<Harness onSelectionChange={onSelectionChange} />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-02-01" } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-02-28" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Aplicar" })); });
    assert(calls[0]?.endDateExclusive === "2026-03-01", "fevereiro (28 dias, 2026 não é bissexto) converte corretamente para fim exclusivo 01/03");
    cleanup();
  }
  {
    const { calls, onSelectionChange } = captureSelectionChanges();
    render(<Harness onSelectionChange={onSelectionChange} />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2025-12-29" } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-01-05" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Aplicar" })); });
    assert(calls[0]?.label === "29/12/2025 a 05/01/2026", "personalizado atravessando a virada do ano aplica e rotula corretamente");
    cleanup();
  }

  console.log("\n[dom] TIMEZONE E DIA OPERACIONAL -- visíveis apenas no Modo Gestor");
  {
    render(<Harness managerMode={true} />);
    await act(async () => { openPopover(); });
    assert(screen.getByText(`Timezone: ${TZ}`) !== null, "Modo Gestor mostra o timezone da empresa");
    assert(screen.getByText(`Virada do dia operacional: ${OP_START}`) !== null, "Modo Gestor mostra a virada operacional (04:00)");
    cleanup();
  }
  {
    render(<Harness managerMode={false} />);
    await act(async () => { openPopover(); });
    assert(screen.queryByTestId("period-manager-details") === null, "Visão simples NÃO mostra o bloco de timezone/virada operacional");
    cleanup();
  }

  console.log("\n[dom] REGRESSÃO -- presets não personalizados continuam aplicando direto, sem depender do rascunho");
  {
    const { calls, onSelectionChange } = captureSelectionChanges();
    render(<Harness initialPreset="THIS_MONTH" onSelectionChange={onSelectionChange} />);
    await act(async () => { openPopover(); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Últimos 7 dias" })); });
    assert(calls[0]?.preset === "LAST_7_DAYS" && calls[0]?.isCustom === false, "preset não-CUSTOM aplica imediatamente com isCustom=false");
    assert(screen.queryByLabelText("Data inicial") === null, "popover fecha após aplicar um preset não personalizado");
  }

  console.log(`\n[dom result] ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
