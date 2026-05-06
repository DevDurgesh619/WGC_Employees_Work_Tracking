import { TaskPriority } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const VARIANT: Record<TaskPriority, React.ComponentProps<typeof Badge>["variant"]> = {
  [TaskPriority.LOW]: "outline",
  [TaskPriority.MEDIUM]: "secondary",
  [TaskPriority.HIGH]: "default",
  [TaskPriority.URGENT]: "destructive",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={VARIANT[priority]}>{priority}</Badge>;
}
