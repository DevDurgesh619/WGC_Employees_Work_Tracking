import Link from "next/link";

import { TaskRequestStatus } from "@prisma/client";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyTaskRequestListItem } from "@/server/queries/task-requests";

const STATUS_VARIANT: Record<
  TaskRequestStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  [TaskRequestStatus.OPEN]: "default",
  [TaskRequestStatus.FULFILLED]: "secondary",
  [TaskRequestStatus.DECLINED]: "destructive",
};

const STATUS_LABEL: Record<TaskRequestStatus, string> = {
  [TaskRequestStatus.OPEN]: "Pending",
  [TaskRequestStatus.FULFILLED]: "Fulfilled",
  [TaskRequestStatus.DECLINED]: "Declined",
};

export function MyRequestsCard({ requests }: { requests: MyTaskRequestListItem[] }) {
  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your task requests</CardTitle>
        <CardDescription>{requests.length} on record</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                <span className="text-muted-foreground text-xs">
                  {format(r.createdAt, "MMM d, h:mm a")}
                </span>
              </div>
              {r.message ? (
                <p className="text-muted-foreground line-clamp-2 text-sm">{r.message}</p>
              ) : null}
              {r.status === TaskRequestStatus.FULFILLED && r.fulfilledByTask ? (
                <Link
                  href={`/tasks/${r.fulfilledByTask.id}`}
                  className="text-primary inline-block text-sm hover:underline"
                >
                  → {r.fulfilledByTask.title}
                </Link>
              ) : null}
              {r.status === TaskRequestStatus.DECLINED && r.declineReason ? (
                <p className="text-muted-foreground text-xs italic">
                  Reason: {r.declineReason}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
