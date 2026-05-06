import { TaskStatus } from "@prisma/client";
import { format } from "date-fns";

import { AddLogDialog } from "@/components/work-logs/add-log-dialog";
import { EditLogDialog } from "@/components/work-logs/edit-log-dialog";
import { LogDatePicker } from "@/components/work-logs/date-picker";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireEmployee } from "@/lib/auth";
import { formatMinutesAsHours, todayIsoDate } from "@/lib/time";
import { getMyDay } from "@/server/queries/work-logs";
import { listTasksForUser } from "@/server/queries/tasks";

export const metadata = {
  title: "Log work — Wallick Work Tracker",
};

type SearchParams = Promise<{ date?: string }>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const OPEN_STATUSES = new Set<TaskStatus>([
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
]);

function parseIsoDate(raw: string | undefined): { iso: string; date: Date } {
  const iso = raw && ISO_DATE_RE.test(raw) ? raw : todayIsoDate();
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return { iso, date: new Date(Date.UTC(y, m - 1, d)) };
}

export default async function LogPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireEmployee();
  const { date: rawDate } = await searchParams;
  const { iso, date } = parseIsoDate(rawDate);

  const [day, allTasks] = await Promise.all([
    getMyDay(user.id, date),
    listTasksForUser(user.id),
  ]);

  // Surface open tasks first; closed ones are still selectable for retrospective logs.
  const taskOptions = [...allTasks]
    .sort((a, b) => Number(OPEN_STATUSES.has(b.status)) - Number(OPEN_STATUSES.has(a.status)))
    .map((t) => ({ id: t.id, title: t.title }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Log work</h1>
          <p className="text-muted-foreground text-sm">
            Tracking time for {format(date, "EEEE, MMM d, yyyy")}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LogDatePicker value={iso} />
          <AddLogDialog date={iso} tasks={taskOptions} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between space-y-0">
          <div>
            <CardTitle>Day total</CardTitle>
            <CardDescription>{day.logs.length} entries</CardDescription>
          </div>
          <p className="text-2xl font-semibold">{formatMinutesAsHours(day.totalMinutes)}</p>
        </CardHeader>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Minutes</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {day.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                  No logs for {iso === todayIsoDate() ? "today" : iso} yet.
                </TableCell>
              </TableRow>
            ) : (
              day.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.task?.title ?? log.freeTextTask ?? "—"}
                    {!log.taskId ? (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Free text
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md text-sm">
                    {log.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === "DONE" ? "secondary" : "default"}>
                      {log.status === "DONE" ? "Done" : "In progress"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{log.minutes}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditLogDialog
                        log={{
                          id: log.id,
                          taskId: log.taskId,
                          freeTextTask: log.freeTextTask,
                          description: log.description,
                          minutes: log.minutes,
                          output: log.output,
                          status: log.status,
                          createdAt: log.createdAt,
                        }}
                        taskOptions={taskOptions}
                      />
                    </div>
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

