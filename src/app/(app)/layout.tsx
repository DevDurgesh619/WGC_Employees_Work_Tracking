import { TaskStatus } from "@prisma/client";

import { QueryProvider } from "@/components/providers/query-provider";
import { RefreshOnVisible } from "@/components/providers/refresh-on-visible";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth";
import { isFounder } from "@/lib/rbac";
import { listTasksForUser } from "@/server/queries/tasks";

const OPEN_STATUSES = new Set<TaskStatus>([
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
]);

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Founders don't run timers, so skip the task lookup their topbar would never use.
  const timerTaskOptions = isFounder(user)
    ? undefined
    : (await listTasksForUser(user.id))
        .filter((t) => OPEN_STATUSES.has(t.status))
        .map((t) => ({ id: t.id, title: t.title }));

  return (
    <QueryProvider>
      <RefreshOnVisible />
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground focus:ring-ring sr-only rounded-md px-3 py-1.5 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:ring-2"
      >
        Skip to main content
      </a>
      <div className="bg-background flex min-h-svh">
        <Sidebar user={user} />
        <div className="flex flex-1 flex-col">
          <Topbar user={user} timerTaskOptions={timerTaskOptions} />
          <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
