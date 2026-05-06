"use client";

import { useState, useTransition } from "react";

import { TaskStatus } from "@prisma/client";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL } from "@/components/tasks/status-badge";
import { canTransitionTaskStatus } from "@/lib/validations/task";
import { setTaskStatus } from "@/server/actions/tasks";

type Props = {
  taskId: string;
  current: TaskStatus;
};

const ALL_STATUSES: TaskStatus[] = [
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.DONE,
  TaskStatus.BLOCKED,
  TaskStatus.CANCELLED,
];

export function StatusChanger({ taskId, current }: Props) {
  const [value, setValue] = useState<TaskStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onChange = (next: string | null) => {
    if (!next) return;
    const target = next as TaskStatus;
    setError(null);
    if (!canTransitionTaskStatus(value, target)) {
      setError(`Can’t move from ${STATUS_LABEL[value]} to ${STATUS_LABEL[target]}.`);
      return;
    }
    setValue(target);
    startTransition(async () => {
      const result = await setTaskStatus(taskId, { status: target });
      if (!result.ok) {
        const message = result.message ?? "Could not update status.";
        setError(message);
        toast.error(message);
        setValue(current); // revert optimistic state
        return;
      }
      toast.success(`Status set to ${STATUS_LABEL[target]}.`);
    });
  };

  return (
    <div className="space-y-1">
      <Select value={value} onValueChange={onChange} disabled={isPending}>
        <SelectTrigger className="w-44" data-testid="status-changer-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_STATUSES.map((s) => {
            const allowed = canTransitionTaskStatus(value, s);
            return (
              <SelectItem key={s} value={s} disabled={!allowed && s !== value}>
                {STATUS_LABEL[s]}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
