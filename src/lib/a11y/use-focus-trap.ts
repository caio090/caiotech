"use client";
import { useEffect } from "react";

const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => element.offsetParent !== null);
}

/**
 * Pure decision logic for Tab/Shift+Tab cycling, kept DOM-free so it can be
 * unit-tested with plain mock objects instead of a real focus/DOM environment.
 * Returns the element that should receive focus, or null if Tab should be
 * left alone (focus is already inside the trap and not on a boundary).
 */
export function resolveFocusTarget<T>(focusable: T[], current: T | null | undefined, containerContains: (element: T) => boolean, shiftKey: boolean): T | null {
  if (focusable.length === 0) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const outside = current == null || !containerContains(current);
  if (shiftKey) return outside || current === first ? last : null;
  return outside || current === last ? first : null;
}

/** Keeps Tab/Shift+Tab cycling within `containerRef` while `active` is true. Does not manage initial focus, ESC, or focus return -- callers keep doing that themselves. */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) { event.preventDefault(); container.focus(); return; }
      const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const target = resolveFocusTarget(focusable, current, (element) => container.contains(element), event.shiftKey);
      if (target) { event.preventDefault(); target.focus(); }
    };
    addEventListener("keydown", onKeyDown);
    return () => removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}
