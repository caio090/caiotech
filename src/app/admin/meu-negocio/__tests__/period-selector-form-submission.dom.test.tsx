/**
 * Hotfix de Production ("HOTFIX DO PERÍODO PERSONALIZADO EM PRODUCTION"):
 * o Codex Web reportou, no domínio oficial, que 20/07->10/07 continuava
 * aplicável e que 01/07->15/07 virava 01/07->31/07 na reabertura -- ambos os
 * sintomas do estado React ficando desatualizado em relação ao DOM real do
 * input type="date" (autofill, automação de navegador, ou qualquer caminho
 * que dispare só "input" ou só "change", não os dois).
 *
 * Este arquivo testa exatamente os três caminhos de evento descritos no
 * ticket -- onChange normal, input sem change, e valor de DOM alterado
 * diretamente com submit disparado sem que NENHUM evento React tenha
 * atualizado o estado antes -- provando que o submit real (FormData) é a
 * barreira final, independente do estado React.
 *
 * Executar com: node .tmp/run-tsx-dom-test.cjs <este arquivo>
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

function captureSelectionChanges() {
  const calls: BusinessPeriodSelection[] = [];
  return { calls, onSelectionChange: (s: BusinessPeriodSelection) => { calls.push(s); } };
}

function Harness({ onSelectionChange }: { onSelectionChange?: (s: BusinessPeriodSelection) => void }) {
  const [selection, setSelection] = React.useState<BusinessPeriodSelection>(() => buildPeriodSelection("THIS_MONTH", TZ, OP_START, NOW));
  return <PeriodSelector selection={selection} onChange={(next) => { setSelection(next); onSelectionChange?.(next); }} timezone={TZ} operationalDayStart={OP_START} managerMode={true} />;
}

function openPopover() { fireEvent.click(screen.getAllByRole("button")[0]); }

function setNativeDateValue(input: HTMLInputElement, value: string) {
  // Simula um input nativo type="date" mudando de valor "por baixo" do React
  // -- usa o setter nativo do protótipo, exatamente como ferramentas de
  // automação/autofill fazem, para não passar pelo setter que o React
  // rastreia internamente.
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  nativeSetter.call(input, value);
}

async function run() {
  console.log("\n[dom] CAMINHO A -- onChange normal do React");
  {
    let called = false;
    render(<Harness onSelectionChange={() => { called = true; }} />);
    await act(async () => { openPopover(); });
    const start = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const end = screen.getByLabelText("Data final") as HTMLInputElement;
    await act(async () => { fireEvent.change(start, { target: { value: "2026-07-20" } }); });
    await act(async () => { fireEvent.change(end, { target: { value: "2026-07-10" } }); });
    const apply = screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement;
    assert(apply.disabled, "onChange: Aplicar desabilitado com 20/07 > 10/07");
    assert(screen.getByRole("alert") !== null, "onChange: mensagem de erro presente");
    await act(async () => { fireEvent.click(apply); });
    assert(!called, "onChange: callback não chamado com intervalo inválido");
    cleanup();
  }

  console.log("\n[dom] CAMINHO B -- apenas evento input, sem change");
  {
    let called = false;
    render(<Harness onSelectionChange={() => { called = true; }} />);
    await act(async () => { openPopover(); });
    const start = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const end = screen.getByLabelText("Data final") as HTMLInputElement;
    await act(async () => { fireEvent.input(start, { target: { value: "2026-07-20" } }); });
    await act(async () => { fireEvent.input(end, { target: { value: "2026-07-10" } }); });
    const apply = screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement;
    assert(apply.disabled, "input-only: Aplicar desabilitado (onInput também atualiza o estado, não só onChange)");
    await act(async () => { fireEvent.click(apply); });
    assert(!called, "input-only: callback não chamado com intervalo inválido");
    cleanup();
  }
  {
    const { calls, onSelectionChange } = captureSelectionChanges();
    render(<Harness onSelectionChange={onSelectionChange} />);
    await act(async () => { openPopover(); });
    const start = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const end = screen.getByLabelText("Data final") as HTMLInputElement;
    await act(async () => { fireEvent.input(start, { target: { value: "2026-07-01" } }); });
    await act(async () => { fireEvent.input(end, { target: { value: "2026-07-15" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Aplicar" })); });
    assert(calls[0]?.startDate === "2026-07-01" && calls[0]?.endDateExclusive === "2026-07-16", "input-only: 01/07->15/07 aplica corretamente (endDateExclusive=16/07) mesmo só com onInput");
    cleanup();
  }

  console.log("\n[dom] CAMINHO C -- valor do DOM alterado diretamente, SEM nenhum evento React, submit via requestSubmit");
  {
    // Reproduz exatamente a suspeita do ticket: o estado React fica no valor
    // antigo (mês corrente) e o DOM é alterado "por baixo", sem onChange nem
    // onInput -- só um requestSubmit(). Sem a barreira de FormData no
    // submit, isso aplicaria o rascunho React antigo (ex.: viraria o mês
    // inteiro em vez do intervalo pedido).
    let called = false;
    render(<Harness onSelectionChange={() => { called = true; }} />);
    await act(async () => { openPopover(); });
    const start = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const end = screen.getByLabelText("Data final") as HTMLInputElement;
    const form = start.closest("form")!;
    await act(async () => {
      setNativeDateValue(start, "2026-07-20");
      setNativeDateValue(end, "2026-07-10");
      // nenhum fireEvent.change/input -- só o valor do DOM muda
      form.requestSubmit();
    });
    assert(!called, "DOM direto + requestSubmit: intervalo invertido (20/07>10/07) bloqueado mesmo sem o React ter sido notificado antes do submit");
    cleanup();
  }
  {
    const { calls, onSelectionChange } = captureSelectionChanges();
    render(<Harness onSelectionChange={onSelectionChange} />);
    await act(async () => { openPopover(); });
    const start = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const end = screen.getByLabelText("Data final") as HTMLInputElement;
    const form = start.closest("form")!;
    await act(async () => {
      setNativeDateValue(start, "2026-07-01");
      setNativeDateValue(end, "2026-07-15");
      form.requestSubmit();
    });
    assert(calls.length === 1, "DOM direto + requestSubmit: callback chamado exatamente uma vez para o intervalo válido 01/07-15/07");
    assert(calls[0]?.startDate === "2026-07-01", "DOM direto: startDate correto veio do FormData, não do estado React (que nunca foi atualizado por evento)");
    assert(calls[0]?.endDateExclusive === "2026-07-16", "DOM direto: endDateExclusive=16/07 correto (NÃO vira 01/08/mês completo, que seria o sintoma relatado pelo Codex Web)");
    assert(calls[0]?.label === "01/07/2026 a 15/07/2026", "DOM direto: label reflete o valor real do formulário, não um fallback mensal");
    assert(calls[0]?.comparisonLabel === "16/06/2026 até 30/06/2026", "DOM direto: comparação correta (exemplo exato do ticket)");
    cleanup();
  }

  console.log("\n[dom] Reabertura após aplicação via DOM direto (Fase 7)");
  {
    const { onSelectionChange } = captureSelectionChanges();
    render(<Harness onSelectionChange={onSelectionChange} />);
    await act(async () => { openPopover(); });
    const start1 = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const end1 = screen.getByLabelText("Data final") as HTMLInputElement;
    const form1 = start1.closest("form")!;
    await act(async () => {
      setNativeDateValue(start1, "2026-07-01");
      setNativeDateValue(end1, "2026-07-15");
      form1.requestSubmit();
    });
    await act(async () => { openPopover(); });
    const reopenedStart = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const reopenedEnd = screen.getByLabelText("Data final") as HTMLInputElement;
    assert(reopenedStart.value === "2026-07-01", "reabertura: Data inicial = 2026-07-01");
    assert(reopenedEnd.value === "2026-07-15", "reabertura: Data final = 2026-07-15 (NÃO 2026-07-31, o sintoma relatado em Production)");
    cleanup();
  }

  console.log(`\n[dom result] ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
