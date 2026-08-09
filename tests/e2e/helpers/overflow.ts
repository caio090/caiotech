import type { Page } from "@playwright/test";

export interface OverflowOffender {
  selector: string;
  left: number;
  right: number;
  width: number;
}

export interface OverflowReport {
  documentOverflow: boolean;
  offenders: OverflowOffender[];
}

/**
 * Sprint E2E CI 3.0.2.2 (Fase 10/23) — mesmo critério do brief:
 * scrollWidth do documento/body vs. innerWidth, e elementos cuja
 * bounding box escapa da viewport. Ignora automaticamente containers com
 * overflow-x próprio (carrossel/scroller intencional) e elementos
 * invisíveis — o resto é reportado para o teste decidir se é falha.
 *
 * Sprint QA Fix 3.0.2.5 (CI-HARNESS-OVERFLOW-EXEMPTION-001) — a isenção
 * acima só pulava o PRÓPRIO elemento com overflow-x:auto/scroll, nunca seus
 * descendentes. Um scroller intencional (ex.: roadmap-kanban, o subnav do
 * REC OS, os filtros em pílula de Status/Arquitetura) sempre tem filhos
 * cuja bounding box escapa da viewport — é exatamente para isso que o
 * scroll existe — mas cada filho era checado individualmente e reportado
 * como falso positivo. Agora qualquer elemento com um ancestral
 * overflow-x:auto/scroll também é ignorado, igual ao próprio container.
 */
export async function findOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const documentOverflow =
      document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1;

    const offenders: OverflowOffender[] = [];
    const all = document.querySelectorAll<HTMLElement>("body *");

    function hasScrollableAncestor(node: HTMLElement): boolean {
      let current = node.parentElement;
      while (current) {
        const parentStyle = window.getComputedStyle(current);
        if (parentStyle.overflowX === "auto" || parentStyle.overflowX === "scroll") return true;
        current = current.parentElement;
      }
      return false;
    }

    all.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return;
      // Container com scroll horizontal próprio (carrossel/roadmap kanban/etc.) é intencional,
      // assim como qualquer descendente dele (ver comentário acima).
      if (style.overflowX === "auto" || style.overflowX === "scroll") return;
      if (hasScrollableAncestor(el)) return;

      if (rect.left < -1 || rect.right > vw + 1 || rect.width > vw + 1) {
        const id = el.id ? `#${el.id}` : "";
        const firstClasses = typeof el.className === "string" && el.className
          ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
          : "";
        offenders.push({
          selector: `${el.tagName.toLowerCase()}${id}${firstClasses}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });

    return { documentOverflow, offenders: offenders.slice(0, 20) };
  });
}

export function assertNoOverflow(report: OverflowReport, route: string) {
  if (report.documentOverflow || report.offenders.length > 0) {
    throw new Error(
      `Overflow horizontal em ${route}: documentOverflow=${report.documentOverflow}, ` +
      `ofensores=${JSON.stringify(report.offenders)}`
    );
  }
}
