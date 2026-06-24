import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  done: boolean;
}

interface OnboardingProgressProps {
  steps: Step[];
  title?: string;
  className?: string;
}

export function OnboardingProgress({ steps, title = "Primeiros passos", className }: OnboardingProgressProps) {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <span className="text-xs font-medium text-gray-500">{done}/{total}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-2.5">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2.5">
            {step.done ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
            )}
            <span className={cn("text-xs", step.done ? "text-gray-400 line-through" : "text-gray-700")}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
