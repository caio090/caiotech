import { ClientLayoutShell } from "./_layout-client";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayoutShell>{children}</ClientLayoutShell>;
}
