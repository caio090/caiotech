(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/app/admin/meu-negocio/_period-selector.tsx"), "utf8");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] causa raiz corrigida: rascunho ressincroniza com o período aplicado ao abrir (achado do QA visual)");
{
  // Ajuste feito durante a renderização (padrão oficial do React para
  // "resetar estado quando uma prop muda"), não dentro de um useEffect --
  // um useEffect síncrono aqui causaria um render extra desperdiçado
  // (confirmado pelo próprio ESLint: react-hooks/set-state-in-effect).
  assert(!/useEffect\(\(\) => \{\s*if \(open\) \{\s*setCustomStart/.test(source), "resincronização não usa mais useEffect (evita o render extra apontado pelo ESLint)");
  assert(source.includes("if (open && syncedForSelection?.selection !== selection) {") && source.includes("setCustomStart(selection.startDate);") && source.includes("setCustomEndInclusive(toInclusiveEndDate(selection.endDateExclusive));"), "rascunho é resincronizado durante a renderização sempre que o popover está aberto e a seleção aplicada mudou desde a última sincronização");
  assert(source.includes("setSyncedForSelection(null)"), "marcador de sincronização é limpo ao fechar, garantindo nova sincronização na próxima abertura mesmo se a seleção não mudou nesse meio tempo");
  assert(source.includes("toInclusiveEndDate(selection.endDateExclusive)") && (source.match(/toInclusiveEndDate\(selection\.endDateExclusive\)/g) ?? []).length >= 2, "conversão usa o helper compartilhado tanto na inicialização quanto na resincronização (mesma fonte de verdade)");
}

console.log("\n[test] helpers compartilhados de conversão (Fase 5) -- nada de +1/-1 dia local");
{
  assert(source.includes('import { buildPeriodSelection, formatDateBR, toExclusiveEndDate, toInclusiveEndDate } from "@/lib/business-period/calculations"'), "seletor importa os helpers do módulo central em vez de reimplementar localmente");
  assert(!/function addOneDayInclusive/.test(source), "reimplementação local antiga de +1/-1 dia foi removida");
  assert(source.includes("toExclusiveEndDate(customEndInclusive)"), "aplicar o personalizado converte via o helper compartilhado (fim inclusivo da UI -> exclusivo do domínio)");
}

console.log("\n[test] validação real do intervalo (Fase 4)");
{
  assert(source.includes('!customStart || !customEndInclusive') && source.includes("Informe a data inicial e a data final."), "campos ausentes são bloqueados com mensagem específica");
  assert(source.includes("customStart > customEndInclusive") && source.includes("A data inicial não pode ser posterior à data final."), "início posterior ao fim é bloqueado com mensagem específica");
  assert(source.includes("aria-invalid={validationError !== null}"), "campos marcam aria-invalid quando o rascunho é inválido");
  assert(source.includes('aria-describedby={validationError ? "period-custom-error" : undefined}') && source.includes('id="period-custom-error"') && source.includes('role="alert"'), "mensagem de erro é associada aos campos via aria-describedby e anunciável via role=alert");
  assert(source.includes("disabled={validationError !== null}") && source.includes("aria-disabled={validationError !== null}"), "botão Aplicar fica desabilitado (disabled real, não só visual) quando inválido");
  assert(source.includes("if (validationError) return;"), "handler de aplicar também valida defensivamente, não confia só no disabled do botão");
  assert(!source.includes("alert("), "nenhuma validação usa alert() nativo do navegador");
}

console.log("\n[test] rascunho não altera o período central antes de Aplicar (Fase 3)");
{
  const applyCustomBody = source.split("function applyCustom")[1]?.split("function restoreDefault")[0] ?? "";
  assert(applyCustomBody.includes("onChange("), "período central só é atualizado dentro de applyCustom, nunca nos onChange dos inputs de data");
  assert(!/onChange=\{.*onChange\(/.test(source.split("Personalizado</p>")[1]?.split("</div>")[0] ?? ""), "onChange dos campos de data só atualiza o rascunho local (setCustomStart/setCustomEndInclusive), nunca o período central diretamente");
}

console.log("\n[test] Cancelar e ESC não aplicam, e devolvem o foco (Fase 4/13)");
{
  assert(source.includes("onClick={() => setOpen(false)}") , "botão Cancelar fecha sem chamar onChange (não aplica o rascunho)");
  assert(source.includes('event.key === "Escape"') && source.includes("setOpen(false)"), "ESC fecha o popover");
  assert(source.includes("previous?.focus()"), "foco retorna ao elemento que abriu o seletor ao fechar");
}

console.log("\n[test] Tab cycling dentro do popover (Fase 13)");
{
  assert(source.includes('import { useFocusTrap } from "@/lib/a11y/use-focus-trap"') && source.includes("useFocusTrap(panelRef, open)"), "popover reaproveita o hook de focus trap já validado no drawer de produto (mesmo padrão, sem duplicar lógica)");
}

console.log("\n[test] label do CUSTOM mostra as datas reais (Fase 6 -- achado do QA visual)");
{
  assert(!source.includes('label = "Personalizado"'), "não sobra mais um label genérico \"Personalizado\" para o período aplicado");
}

console.log("\n[test] timezone e dia operacional expandidos no Modo Gestor (Fase 11 -- P2 do QA visual)");
{
  const managerBlock = source.split('data-testid="period-manager-details"')[1] ?? "";
  assert(managerBlock.includes("Configuração desta empresa"), "bloco é rotulado explicitamente como configuração da empresa, não regra global da LOKAT OS");
  assert(managerBlock.includes("Timezone: {timezone}") && managerBlock.includes("Virada do dia operacional: {operationalDayStart}"), "timezone e horário de virada aparecem explicitamente");
  assert(managerBlock.includes("pertencem ao dia operacional anterior"), "explicação curta em linguagem simples sobre o efeito da virada");
  assert(managerBlock.includes("Início operacional:") && managerBlock.includes("Fim operacional:"), "início e fim operacionais do período atual são mostrados (Fase 11)");
  assert(managerBlock.includes("inclusiva") && managerBlock.includes("exclusivo"), "regra inclusivo/exclusivo explicada em linguagem simples no Modo Gestor");
  assert(source.includes("managerMode && (") , "todo o bloco só existe quando managerMode é verdadeiro (não aparece na Visão simples)");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
