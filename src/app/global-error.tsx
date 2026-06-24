"use client";

export const dynamic = "force-dynamic";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Algo deu errado</h2>
            <button
              onClick={() => reset()}
              className="text-sm text-indigo-600 underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
