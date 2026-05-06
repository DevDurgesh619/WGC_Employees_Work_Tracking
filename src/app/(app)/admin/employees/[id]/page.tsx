import Link from "next/link";
import { notFound } from "next/navigation";

import { format } from "date-fns";

import { RangePicker } from "@/components/admin/range-picker";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMinutesAsHours, toIsoDate } from "@/lib/time";
import { getEmployeeWindow, startOfRangeDays, todayUtcMidnight } from "@/server/queries/reports";

export const metadata = {
  title: "Employee — Wallick Work Tracker",
};

type SearchParams = Promise<{ from?: string; to?: string }>;
type Params = Promise<{ id: string }>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_RANGE_DAYS = 14;

function parseIso(raw: string | undefined, fallback: Date): { iso: string; date: Date } {
  if (!raw || !ISO_DATE_RE.test(raw)) {
    return { iso: toIsoDate(fallback), date: fallback };
  }
  const [y, m, d] = raw.split("-").map(Number) as [number, number, number];
  return { iso: raw, date: new Date(Date.UTC(y, m - 1, d)) };
}

export default async function EmployeePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { from: rawFrom, to: rawTo } = await searchParams;

  const today = todayUtcMidnight();
  const fallbackFrom = startOfRangeDays(DEFAULT_RANGE_DAYS - 1);
  const { iso: fromIso, date: from } = parseIso(rawFrom, fallbackFrom);
  const { iso: toIso, date: to } = parseIso(rawTo, today);

  const window = await getEmployeeWindow({ userId: id, from, to });
  if (!window.user) notFound();

  const { user, logs, tasks, timeEntries, totalMinutes } = window;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/overview"
            className="text-muted-foreground text-sm hover:underline"
          >
            ← Team overview
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{user.name}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
        <RangePicker fromIso={fromIso} toIso={toIso} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Total time in range</CardDescription>
            <CardTitle className="text-3xl">{formatMinutesAsHours(totalMinutes)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Logs</CardDescription>
            <CardTitle className="text-3xl">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Timer sessions</CardDescription>
            <CardTitle className="text-3xl">{timeEntries.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily logs</CardTitle>
          <CardDescription>
            {format(from, "MMM d, yyyy")} – {format(to, "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Min</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                    No logs in this range.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(log.date, "MMM d")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.task ? (
                        <Link href={`/tasks/${log.task.id}`} className="hover:underline">
                          {log.task.title}
                        </Link>
                      ) : (
                        <>
                          {log.freeTextTask}{" "}
                          <Badge variant="outline" className="text-[10px]">
                            Free text
                          </Badge>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md text-sm">
                      {log.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === "DONE" ? "secondary" : "default"}>
                        {log.status === "DONE" ? "Done" : "In progress"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{log.minutes}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent tasks</CardTitle>
          <CardDescription>Last 50, regardless of range</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
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
                    No tasks assigned.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/tasks/${t.id}`} className="font-medium hover:underline">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timer sessions</CardTitle>
          <CardDescription>Inside the selected range</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Ended</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="text-right">Min</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                    No timer sessions.
                  </TableCell>
                </TableRow>
              ) : (
                timeEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(e.startedAt, "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {e.endedAt ? format(e.endedAt, "MMM d, HH:mm") : "—"}
                    </TableCell>
                    <TableCell>{e.task?.title ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.minutes ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
