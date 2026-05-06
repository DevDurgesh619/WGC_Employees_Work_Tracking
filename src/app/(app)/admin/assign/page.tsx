import { TaskStatus } from "@prisma/client";

import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { listActiveEmployees } from "@/server/queries/users";

export const metadata = {
  title: "Assign tasks — Wallick Work Tracker",
};

const OPEN_STATUSES = [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED];

async function getEmployeeWorkload() {
  const employees = await listActiveEmployees();
  const counts = await prisma.task.groupBy({
    by: ["assigneeId", "status"],
    where: {
      deletedAt: null,
      assigneeId: { in: employees.map((e) => e.id) },
      status: { in: OPEN_STATUSES },
    },
    _count: { _all: true },
  });

  const byUser = new Map<string, { open: number; inProgress: number }>();
  for (const c of counts) {
    const cur = byUser.get(c.assigneeId) ?? { open: 0, inProgress: 0 };
    cur.open += c._count._all;
    if (c.status === TaskStatus.IN_PROGRESS) cur.inProgress += c._count._all;
    byUser.set(c.assigneeId, cur);
  }

  return employees.map((e) => ({
    ...e,
    open: byUser.get(e.id)?.open ?? 0,
    inProgress: byUser.get(e.id)?.inProgress ?? 0,
  }));
}

export default async function AssignPage() {
  const rows = await getEmployeeWorkload();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assign tasks</h1>
          <p className="text-muted-foreground text-sm">
            Pick one or more employees and create the same task for each.
          </p>
        </div>
        <NewTaskDialog employees={rows} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Open</TableHead>
              <TableHead className="text-right">In progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                  No active employees yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={emp.open === 0 ? "outline" : "secondary"}>{emp.open}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{emp.inProgress}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
