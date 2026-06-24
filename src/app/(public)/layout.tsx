import { PublicHeader } from "@/components/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-100 py-8 px-6 text-center">
        <p className="text-xs text-gray-400">© 2025 LOKAT OS — O sistema operacional do seu negócio</p>
      </footer>
    </div>
  );
}
