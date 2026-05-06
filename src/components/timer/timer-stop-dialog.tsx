"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { WorkLogStatus } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVE_TIMER_QUERY_KEY, type ActiveTimerRow } from "@/hooks/use-active-timer";
import { discardTimer, stopTimer } from "@/server/actions/time-entries";
import { elapsedMinutes } from "@/lib/validations/time-entry";

type TaskOption = { id: string; title: string };

type Props = {
  active: NonNullable<ActiveTimerRow>;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  taskOptions: TaskOption[];
};

const FREE_TEXT_VALUE = "__FREE_TEXT__";

type FormValues = {
  taskChoice: string;
  freeTextTask: string;
  description: string;
  minutes: string;
  output: string;
  status: WorkLogStatus;
};

export function TimerStopDialog({ active, open, onOpenChange, taskOptions }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDiscarding, startDiscardTransition] = useTransition();

  const projectedMinutes = elapsedMinutes(new Date(active.startedAt), new Date());
  const initialTaskChoice = active.taskId ?? FREE_TEXT_VALUE;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      taskChoice: initialTaskChoice,
      freeTextTask: active.task?.title ?? "",
      description: "",
      minutes: String(projectedMinutes),
      output: "",
      status: WorkLogStatus.DONE,
    },
  });

  // Re-seed the form whenever the dialog re-opens for a new session.
  useEffect(() => {
    if (open) {
      reset({
        taskChoice: active.taskId ?? FREE_TEXT_VALUE,
        freeTextTask: active.task?.title ?? "",
        description: "",
        minutes: String(elapsedMinutes(new Date(active.startedAt), new Date())),
        output: "",
        status: WorkLogStatus.DONE,
      });
    }
  }, [open, active.id, active.taskId, active.task, active.startedAt, reset]);

  const taskChoice = watch("taskChoice");
  const isFreeText = taskChoice === FREE_TEXT_VALUE;

  const onSave = (values: FormValues) => {
    startTransition(async () => {
      const result = await stopTimer({
        entryId: active.id,
        workLog: {
          taskId: isFreeText ? undefined : values.taskChoice,
          freeTextTask: isFreeText ? values.freeTextTask : undefined,
          description: values.description,
          minutes: values.minutes,
          output: values.output || undefined,
          status: values.status,
        },
      });
      if (!result.ok) {
        toast.error(result.message ?? "Could not save log.");
        return;
      }
      toast.success(`Logged ${result.data.workLog.minutes} min.`);
      await queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QUERY_KEY });
      router.refresh();
      onOpenChange(false);
    });
  };

  const onDiscard = () => {
    startDiscardTransition(async () => {
      const result = await discardTimer({ entryId: active.id });
      if (!result.ok) {
        toast.error(result.message ?? "Could not discard timer.");
        return;
      }
      toast.success("Timer discarded — no log was saved.");
      await queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QUERY_KEY });
      router.refresh();
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Stop timer & save log</DialogTitle>
          <DialogDescription>
            About <span className="font-medium">{projectedMinutes} min</span> elapsed. Adjust if
            you forgot to start on time.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(onSave)(e);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="stop-task">Task</Label>
            <Controller
              control={control}
              name="taskChoice"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger id="stop-task">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                    <SelectItem value={FREE_TEXT_VALUE}>Free text (no task)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {isFreeText ? (
            <div className="space-y-2">
              <Label htmlFor="freeTextTask">What were you working on?</Label>
              <Input
                id="freeTextTask"
                autoComplete="off"
                placeholder="Short title"
                {...register("freeTextTask", {
                  required: { value: isFreeText, message: "Title is required." },
                  maxLength: { value: 120, message: "Max 120 characters." },
                })}
              />
              {errors.freeTextTask ? (
                <p className="text-destructive text-sm">{errors.freeTextTask.message}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="What did you actually do? (required)"
              {...register("description", {
                required: "Description is required.",
                maxLength: { value: 2000, message: "Max 2000 characters." },
              })}
            />
            {errors.description ? (
              <p className="text-destructive text-sm">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutes</Label>
              <Input
                id="minutes"
                type="number"
                min={1}
                max={1440}
                {...register("minutes", { required: "Minutes are required." })}
              />
              {errors.minutes ? (
                <p className="text-destructive text-sm">{errors.minutes.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? WorkLogStatus.DONE)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={WorkLogStatus.DONE}>Done</SelectItem>
                      <SelectItem value={WorkLogStatus.IN_PROGRESS}>In progress</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="output">Output (optional)</Label>
            <Textarea
              id="output"
              rows={2}
              placeholder="Link to PR, doc, deliverable…"
              {...register("output", {
                maxLength: { value: 2000, message: "Max 2000 characters." },
              })}
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={onDiscard}
              disabled={isPending || isDiscarding}
            >
              {isDiscarding ? "Discarding…" : "Discard timer"}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending || isDiscarding}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isDiscarding}>
                {isPending ? "Saving…" : "Save log"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
