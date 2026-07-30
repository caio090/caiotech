"use client";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { gsap, useGSAP } from "@/lib/motion/gsap-client";
import { motionDurations, motionEasings } from "@/lib/motion/motion-tokens";
export function MotionSection({ children, className, motionKey }: { children: ReactNode; className?: string; motionKey: string }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => { const media = gsap.matchMedia(); media.add("(prefers-reduced-motion: no-preference)", () => { gsap.fromTo(scope.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: motionDurations.standard, ease: motionEasings.enter, clearProps: "transform,opacity,visibility" }); }); return () => media.revert(); }, { scope, dependencies: [motionKey], revertOnUpdate: true });
  return <div ref={scope} className={cn("min-w-0", className)} data-motion-section={motionKey}>{children}</div>;
}
