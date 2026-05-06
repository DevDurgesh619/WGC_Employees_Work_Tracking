import Link from "next/link";

import { TaskStatus } from "@prisma/client";
import { format } from "date-fns";

import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { TasksStatusFilter } from "@/components/tasks/tasks-status-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireEmployee } from "@/lib/auth";
import { listTasksForUser } from "@/server/queries/tasks";

export const metadata = {
  title: "My tasks — Wallick Work Tracker",
};

type SearchParams = Promise<{ status?: string }>;

function parseStatus(raw: string | undefined): TaskStatus | undefined {
  if (!raw) return undefined;
  return (Object.values(TaskStatus) as string[]).includes(raw) ? (raw as TaskStatus) : undefined;
}

export default async function MyTasksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireEmployee();
  const { status } = await searchParams;
  const statusFilter = parseStatus(status);

  const tasks = await listTasksForUser(user.id, { status: statusFilter });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My tasks</h1>
          <p className="text-muted-foreground text-sm">
            Sorted by priority, then due date. Sharper deadlines bubble up first.
          </p>
        </div>
        <TasksStatusFilter />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                  {statusFilter ? "Nothing matches this filter." : "No tasks assigned to you yet."}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/tasks/${t.id}`} className="hover:underline">
                      {t.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.dueDate ? format(t.dueDate, "MMM d, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
