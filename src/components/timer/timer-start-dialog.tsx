"use client";

import { useState, useTransition } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVE_TIMER_QUERY_KEY } from "@/hooks/use-active-timer";
import { startTimer } from "@/server/actions/time-entries";

type TaskOption = { id: string; title: string };

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  taskOptions: TaskOption[];
  onConflict: () => void;
};

const NO_TASK_VALUE = "__NO_TASK__";

export function TimerStartDialog({ open, onOpenChange, taskOptions, onConflict }: Props) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [taskChoice, setTaskChoice] = useState<string>(taskOptions[0]?.id ?? NO_TASK_VALUE);

  const onStart = () => {
    startTransition(async () => {
      const result = await startTimer({
        taskId: taskChoice === NO_TASK_VALUE ? undefined : taskChoice,
      });
      if (!result.ok) {
        if (result.error === "CONFLICT") {
          await queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QUERY_KEY });
          onOpenChange(false);
          onConflict();
          return;
        }
        toast.error(result.message ?? "Could not start timer.");
        return;
      }
      toast.success("Timer started.");
      await queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QUERY_KEY });
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start timer</DialogTitle>
          <DialogDescription>
            Pick what you’re working on. You can change this when you stop, too.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="start-task">Task</Label>
          <Select value={taskChoice} onValueChange={(v) => setTaskChoice(v ?? NO_TASK_VALUE)}>
            <SelectTrigger id="start-task">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
              <SelectItem value={NO_TASK_VALUE}>Track free time (no task)</SelectItem>
            </SelectContent>
          </Select>
          {taskOptions.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No open tasks assigned to you — you can still track free time.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onStart} disabled={isPending}>
            {isPending ? "Starting…" : "Start timer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
