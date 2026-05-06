import { TaskStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const VARIANT: Record<TaskStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  [TaskStatus.NOT_STARTED]: "outline",
  [TaskStatus.IN_PROGRESS]: "default",
  [TaskStatus.DONE]: "secondary",
  [TaskStatus.BLOCKED]: "destructive",
  [TaskStatus.CANCELLED]: "outline",
};

const LABEL: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "Not started",
  [TaskStatus.IN_PROGRESS]: "In progress",
  [TaskStatus.DONE]: "Done",
  [TaskStatus.BLOCKED]: "Blocked",
  [TaskStatus.CANCELLED]: "Cancelled",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}

export const STATUS_LABEL = LABEL;
