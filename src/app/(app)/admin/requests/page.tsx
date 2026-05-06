import Link from "next/link";

import { TaskRequestStatus } from "@prisma/client";
import { format, formatDistanceToNow } from "date-fns";

import { DeclineRequestDialog } from "@/components/task-requests/decline-request-dialog";
import { FulfillRequestDialog } from "@/components/task-requests/fulfill-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listTaskRequests, type TaskRequestListItem } from "@/server/queries/task-requests";

export const metadata = {
  title: "Task requests — Wallick Work Tracker",
};

const STATUS_VARIANT: Record<
  TaskRequestStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  [TaskRequestStatus.OPEN]: "default",
  [TaskRequestStatus.FULFILLED]: "secondary",
  [TaskRequestStatus.DECLINED]: "destructive",
};

const STATUS_LABEL: Record<TaskRequestStatus, string> = {
  [TaskRequestStatus.OPEN]: "Open",
  [TaskRequestStatus.FULFILLED]: "Fulfilled",
  [TaskRequestStatus.DECLINED]: "Declined",
};

function partition(rows: TaskRequestListItem[]): {
  open: TaskRequestListItem[];
  resolved: TaskRequestListItem[];
} {
  const open: TaskRequestListItem[] = [];
  const resolved: TaskRequestListItem[] = [];
  for (const r of rows) {
    if (r.status === TaskRequestStatus.OPEN) open.push(r);
    else resolved.push(r);
  }
  return { open, resolved };
}

export default async function AdminRequestsPage() {
  const requests = await listTaskRequests();
  const { open, resolved } = partition(requests);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Task requests</h1>
        <p className="text-muted-foreground text-sm">
          {open.length} open · {resolved.length} resolved
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open queue</CardTitle>
          <CardDescription>
            Fulfill creates a task and assigns it to the requester. Decline closes
            the request with an optional note.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Asked</TableHead>
                <TableHead className="w-48 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                    No open requests. Everyone&apos;s got something to do.
                  </TableCell>
                </TableRow>
              ) : (
                open.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.requester.name}</div>
                      <div className="text-muted-foreground text-xs">{r.requester.email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md text-sm">
                      {r.message ?? <span className="italic">(no message)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <FulfillRequestDialog
                          requestId={r.id}
                          requesterName={r.requester.name}
                          requesterMessage={r.message}
                        />
                        <DeclineRequestDialog
                          requestId={r.id}
                          requesterName={r.requester.name}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {resolved.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Resolved</CardTitle>
            <CardDescription>{resolved.length} most recent</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolved.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.requester.name}</div>
                      <div className="text-muted-foreground text-xs">{r.requester.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md text-sm">
                      {r.status === TaskRequestStatus.FULFILLED && r.fulfilledByTask ? (
                        <Link
                          href={`/tasks/${r.fulfilledByTask.id}`}
                          className="text-primary hover:underline"
                        >
                          {r.fulfilledByTask.title}
                        </Link>
                      ) : r.status === TaskRequestStatus.DECLINED && r.declineReason ? (
                        <span className="italic">{r.declineReason}</span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.respondedAt ? format(r.respondedAt, "MMM d, h:mm a") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
