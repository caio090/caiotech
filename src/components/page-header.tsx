import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Sprint REC OS 3.0.1 (Fase 33): antes, `flex items-start justify-between`
 * sem `flex-wrap` nem stacking colocava título e ação (ex.: botão "Ação
 * rápida") competindo pela mesma linha em qualquer largura — em 390px isso
 * cortava o título ou empurrava o botão para fora da viewport (print real
 * do usuário). Agora empilha em coluna até `sm:` e só vira linha a partir
 * daí; o título ganha `min-w-0 truncate` para nunca forçar overflow do
 * contêiner pai mesmo com um texto muito longo.
 */
export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:flex-nowrap">{children}</div>}
    </div>
  );
}
