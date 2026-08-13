"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { InlineCompanyPicker } from "@/components/command-center/inline-company-picker";

/**
 * LOKAT OS — Company Selector Final UX (modal). Camada de apresentação
 * compartilhada sobre o mesmo InlineCompanyPicker/useAuthorizedCompanies já
 * usado no Command Center e no popover do header -- nunca um segundo picker,
 * nunca uma segunda fonte de Companies autorizadas. Segue o mesmo padrão
 * visual de overlay já estabelecido no repositório (ver welcome-tour-modal.tsx:
 * `fixed inset-0 z-[100] ... bg-black/40 backdrop-blur-sm`), único componente
 * novo desta correção -- não existia um Dialog/Modal canônico reaproveitável.
 */
export function CompanySelectorDialog({
  open,
  onClose,
  onSelect,
  onNewClient,
  title = "Selecionar empresa",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (companyId: string, companyName: string | null) => void;
  onNewClient?: () => void;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      data-testid="company-selector-dialog"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Fechar"
            data-testid="company-selector-dialog-close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-4">
          <InlineCompanyPicker theme="light" onSelect={onSelect} onNewClient={onNewClient} />
        </div>
      </div>
    </div>
  );
}
