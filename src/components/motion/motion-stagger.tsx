"use client";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { gsap, useGSAP } from "@/lib/motion/gsap-client";
import { motionDurations, motionEasings } from "@/lib/motion/motion-tokens";
export function MotionStagger({ children, className, "data-testid": testId }: { children: ReactNode; className?: string; "data-testid"?: string }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => { const media = gsap.matchMedia(); media.add("(prefers-reduced-motion: no-preference)", () => { const items = scope.current ? Array.from(scope.current.children) : []; gsap.fromTo(items, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: motionDurations.dataReveal, ease: motionEasings.enter, stagger: 0.045, clearProps: "transform,opacity,visibility" }); }); return () => media.revert(); }, { scope });
  return <div ref={scope} className={cn(className)} data-testid={testId}>{children}</div>;
}
