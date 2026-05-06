import Link from "next/link";
import { redirect } from "next/navigation";

import { TaskRequestStatus, TaskStatus } from "@prisma/client";

import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { MyRequestsCard } from "@/components/task-requests/my-requests-card";
import { RequestTaskDialog } from "@/components/task-requests/request-task-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { isFounder } from "@/lib/rbac";
import { formatMinutesAsHours } from "@/lib/time";
import { listTasksForUser } from "@/server/queries/tasks";
import { listMyTaskRequests } from "@/server/queries/task-requests";
import { getMyDay } from "@/server/queries/work-logs";

export const metadata = {
  title: "Dashboard — Wallick Work Tracker",
};

const OPEN_STATUSES = new Set<TaskStatus>([
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
]);

function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export default async function DashboardPage() {
  const user = await requireUser();
  // Founders don't run timers or log their own work — send them to the team view.
  if (isFounder(user)) redirect("/admin/overview");
  const today = todayDate();

  const [day, tasks, requests] = await Promise.all([
    getMyDay(user.id, today),
    listTasksForUser(user.id),
    listMyTaskRequests(user.id),
  ]);

  const openTasks = tasks.filter((t) => OPEN_STATUSES.has(t.status)).slice(0, 5);
  const hasOpenRequest = requests.some((r) => r.status === TaskRequestStatus.OPEN);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hello, {user.name}.</h1>
        <p className="text-muted-foreground text-sm">Here’s where things stand today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Today’s logged time</CardDescription>
            <CardTitle className="text-3xl">{formatMinutesAsHours(day.totalMinutes)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {day.logs.length} {day.logs.length === 1 ? "entry" : "entries"} today.
            </p>
            <Link href="/log" className="text-primary mt-2 inline-block text-sm hover:underline">
              Open log →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Open tasks</CardDescription>
            <CardTitle className="text-3xl">{day.openTasks}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {day.openTasks === 0 ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Nothing assigned right now. Need work?
                </p>
                <RequestTaskDialog hasOpenRequest={hasOpenRequest} size="sm" />
              </>
            ) : (
              <div className="flex items-center justify-between">
                <Link href="/tasks" className="text-primary text-sm hover:underline">
                  See all tasks →
                </Link>
                <RequestTaskDialog hasOpenRequest={hasOpenRequest} size="sm" variant="outline" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MyRequestsCard requests={requests} />

      {openTasks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Up next</CardTitle>
            <CardDescription>Top {openTasks.length} by priority and due date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {openTasks.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="hover:bg-accent flex items-center justify-between rounded-md p-2 text-sm"
              >
                <span className="font-medium">{t.title}</span>
                <span className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
