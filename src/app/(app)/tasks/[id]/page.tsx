import Link from "next/link";
import { notFound } from "next/navigation";

import { format } from "date-fns";

import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { StatusChanger } from "@/components/tasks/status-changer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/auth";
import { canEditTask } from "@/lib/rbac";
import { getTaskById } from "@/server/queries/tasks";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Task — Wallick Work Tracker",
};

export default async function TaskDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser();
  const task = await getTaskById(id);
  if (!task) notFound();

  // Only founders, the assignee, and the creator can view a task's detail.
  // Employees who aren't the assignee/creator get a 403-ish 404 (don't leak existence).
  const isViewable =
    user.role === "FOUNDER" || task.assigneeId === user.id || task.createdById === user.id;
  if (!isViewable) notFound();

  const isStatusEditor = canEditTask(user, task);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/tasks" className="text-muted-foreground text-sm hover:underline">
          ← My tasks
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{task.title}</h1>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Created {format(task.createdAt, "MMM d, yyyy")} by {task.createdBy.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-xs">Priority</p>
              <PriorityBadge priority={task.priority} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <StatusBadge status={task.status} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Due</p>
              <p>{task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Estimated</p>
              <p>{task.estimatedMinutes ? `${task.estimatedMinutes} min` : "—"}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground text-xs">Assigned to</p>
            <p>{task.assignee.name}</p>
          </div>

          {task.description ? (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Description</p>
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            </>
          ) : null}

          {isStatusEditor ? (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Update status</p>
                <StatusChanger taskId={task.id} current={task.status} />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {task.workLogs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Work logs</CardTitle>
            <CardDescription>{task.workLogs.length} entries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {task.workLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{format(log.date, "MMM d, yyyy")}</p>
                  <p className="text-muted-foreground">{log.description}</p>
                </div>
                <p className="text-muted-foreground text-xs whitespace-nowrap">{log.minutes} min</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
