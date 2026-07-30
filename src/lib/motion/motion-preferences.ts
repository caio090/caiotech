"use client";
import { useEffect, useState } from "react";
export function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => { const query = matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReduced(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  return reduced;
}
export function canUseDecorativeWebGL() { return innerWidth >= 768 && !matchMedia("(pointer: coarse)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches; }
