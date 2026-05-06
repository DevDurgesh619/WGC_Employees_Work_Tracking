import { requireFounder } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Redirects to /403 for non-founders, /login for unauthenticated users.
  await requireFounder();
  return <>{children}</>;
}
