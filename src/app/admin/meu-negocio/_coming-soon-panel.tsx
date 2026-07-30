"use client";

import { Clock } from "lucide-react";

export function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md mx-auto">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Clock className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-bold text-gray-900 mb-1">{title} — em breve</p>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
