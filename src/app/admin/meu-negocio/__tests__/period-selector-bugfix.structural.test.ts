/**
 * Fase 10 (correção definitiva): LACUNA ENCONTRADA -- todas as asserções
 * deste arquivo leem _period-selector.tsx como TEXTO (fs.readFileSync +
 * string/regex) e nunca montam o componente nem disparam um evento real.
 * Isso prova que certos PADRÕES DE CÓDIGO existem (imports corretos, nomes de
 * função, presença de atributos JSX), mas NUNCA prova que um clique real
 * aciona o handler real, nem que o callback real recebe os argumentos
 * certos, nem que o CSS realmente evita overflow em 390px -- por isso é
 * estruturalmente incapaz de detectar uma regressão puramente de
 * comportamento renderizado (por isso o nome do arquivo é ".structural.").
 *
 * A prova comportamental real (montagem via @testing-library/react + jsdom,
 * eventos de verdade, argumentos de callback verificados) está em
 * period-selector-rendered.dom.test.tsx, que substitui este arquivo como
 * fonte de verdade para "o fluxo funciona". Este arquivo é mantido como
 * guarda-corpo estrutural leve (evita reintroduzir padrões já eliminados,
 * como o +1/-1 dia local ou o useEffect síncrono), não como prova de
 * comportamento.
 */
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
  assert(source.includes('import { buildPeriodSelection, formatDateBR, toExclusiveEndDate, toInclusiveEndDate, validateCustomPeriodDraft } from "@/lib/business-period/calculations"'), "seletor importa os helpers do módulo central em vez de reimplementar localmente");
  assert(!/function addOneDayInclusive/.test(source), "reimplementação local antiga de +1/-1 dia foi removida");
  assert(source.includes("toExclusiveEndDate(formEndInclusive)"), "aplicar o personalizado converte via o helper compartilhado (fim inclusivo da UI -> exclusivo do domínio) usando o valor lido do FormData, não mais do estado React direto (hotfix de Production)");
}

console.log("\n[test] validação delega à função central validateCustomPeriodDraft (Fase 3, correção definitiva)");
{
  assert(source.includes("validateCustomPeriodDraft") && source.includes('from "@/lib/business-period/calculations"'), "seletor importa validateCustomPeriodDraft do módulo central, não reimplementa a checagem localmente com ternários ad-hoc");
  assert(source.includes("const validation = validateCustomPeriodDraft({ startDate: customStart, endDateInclusive: customEndInclusive });"), "componente delega toda a decisão de válido/inválido a essa única função (mesma usada pelos testes de unidade em business-period/__tests__/calculations.test.ts)");
  assert(source.includes("aria-invalid={startInvalid}") && source.includes("aria-invalid={endInvalid}"), "cada campo marca aria-invalid de forma independente -- campo vazio/malformado marca só o próprio campo, erro de ordem (início > fim) marca os dois");
  assert(source.includes('aria-describedby={validation.formError ? "period-custom-error" : undefined}') && source.includes('id="period-custom-error"') && source.includes('role="alert"'), "mensagem de erro é associada aos campos via aria-describedby e anunciável via role=alert");
  assert(source.includes("disabled={!validation.valid}") && source.includes("aria-disabled={!validation.valid}"), "botão Aplicar fica desabilitado (disabled real, não só visual) quando inválido");
  assert(source.includes("if (!formValidation.valid) return;"), "handler de aplicar valida defensivamente contra o FormData (hotfix de Production) -- não contra o estado React, que pode estar desatualizado em relação ao DOM real do input");
  assert(source.includes("<form") && source.includes("onSubmit={applyCustom}") && source.includes("event.preventDefault()"), "campos ficam dentro de um <form> real com onSubmit -- Enter também é bloqueado quando inválido, não só o clique no botão (achado do rastreamento do fluxo real desta rodada)");
  assert(source.includes("new FormData(event.currentTarget)"), "hotfix de Production: submit relê o FormData do próprio formulário -- não confia apenas no estado React, que um input nativo type=\"date\" pode alterar sem disparar onChange/onInput em certos cenários de navegador/automação");
  assert(source.includes('name="customStartDate"') && source.includes('name="customEndDate"'), "inputs têm name estável para que o FormData consiga lê-los pelo nome exato");
  assert(source.includes("onInput={handleCustomStartInput}") && source.includes("onInput={handleCustomEndInput}"), "inputs escutam onInput além de onChange -- cobre navegadores/automação que disparam só um dos dois eventos");
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

console.log("\n[test] painel responsivo em mobile 390px (Fase 8 -- P2 do QA visual, verificado com Chromium real via Playwright fora do repositório)");
{
  assert(source.includes("fixed inset-x-3 top-20"), "abaixo de sm: o painel é posicionado relativo à VIEWPORT (fixed + inset-x-3), não mais relativo ao botão que abre o seletor -- esse era o causador real do corte: `absolute right-0` ficava perto da borda ESQUERDA quando o botão quebrava linha em telas estreitas (flex-wrap do banner), então o painel de 320px subtraía para a esquerda da tela");
  assert(source.includes("max-w-[calc(100vw-1.5rem)]"), "largura máxima nunca excede a viewport menos margem (24px), mesmo com o painel fixo à viewport");
  assert(source.includes("sm:absolute sm:inset-x-auto sm:top-auto sm:right-0"), "a partir de sm: (640px) volta ao posicionamento absoluto original ancorado no botão -- layout desktop aprovado não muda");
  assert(source.includes("flex-col gap-1.5 sm:flex-row"), "campos de data empilham em uma coluna abaixo de sm:, lado a lado a partir de sm: (conforme aprovado no desktop)");
  assert(source.includes("min-w-0"), "inputs de data podem encolher (min-w-0) em vez de forçar overflow horizontal dentro do painel");
  assert(source.includes("break-words"), "mensagem de erro quebra linha em vez de vazar horizontalmente em telas estreitas");
  assert(source.includes("max-h-[calc(100vh-6rem)] overflow-y-auto"), "scroll interno do painel só quando necessário (conteúdo mais alto que a viewport), nunca por padrão");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
