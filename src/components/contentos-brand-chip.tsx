"use client";
import { useOnboardingStore } from "@/lib/onboarding-store";

export function ContentOSBrandChip() {
  const data = useOnboardingStore();
  const name = data.marca?.nome;
  return (
    <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium ml-1">
      {name ? name.split(" ")[0] : "—"}
    </span>
  );
}
