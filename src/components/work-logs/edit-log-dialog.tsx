"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { WorkLogStatus } from "@prisma/client";
import { Pencil } from "lucide-react";
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
import { isWithinEditWindow } from "@/lib/validations/work-log";
import { updateWorkLog } from "@/server/actions/work-logs";

type TaskOption = { id: string; title: string };

type LogRow = {
  id: string;
  taskId: string | null;
  freeTextTask: string | null;
  description: string;
  minutes: number;
  output: string | null;
  status: WorkLogStatus;
  createdAt: Date;
};

type Props = {
  log: LogRow;
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

export function EditLogDialog({ log, taskOptions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const editable = isWithinEditWindow(log.createdAt);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      taskChoice: log.taskId ?? FREE_TEXT_VALUE,
      freeTextTask: log.freeTextTask ?? "",
      description: log.description,
      minutes: String(log.minutes),
      output: log.output ?? "",
      status: log.status,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        taskChoice: log.taskId ?? FREE_TEXT_VALUE,
        freeTextTask: log.freeTextTask ?? "",
        description: log.description,
        minutes: String(log.minutes),
        output: log.output ?? "",
        status: log.status,
      });
    }
  }, [open, log, reset]);

  const taskChoice = watch("taskChoice");
  const isFreeText = taskChoice === FREE_TEXT_VALUE;

  const onSave = (values: FormValues) => {
    startTransition(async () => {
      const result = await updateWorkLog(log.id, {
        taskId: isFreeText ? null : values.taskChoice,
        freeTextTask: isFreeText ? values.freeTextTask : null,
        description: values.description,
        minutes: Number(values.minutes),
        output: values.output || null,
        status: values.status,
      });
      if (!result.ok) {
        toast.error(result.message ?? "Could not update log.");
        return;
      }
      toast.success("Log updated.");
      router.refresh();
      setOpen(false);
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={!editable}
        title={editable ? "Edit log" : "Edit window (24h) has closed."}
        aria-label="Edit log"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit work log</DialogTitle>
            <DialogDescription>
              Edits are allowed for 24h after the log was created.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(onSave)(e);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-task">Task</Label>
              <Controller
                control={control}
                name="taskChoice"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger id="edit-task">
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
                <Label htmlFor="edit-freeTextTask">Title</Label>
                <Input
                  id="edit-freeTextTask"
                  autoComplete="off"
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
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={3}
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
                <Label htmlFor="edit-minutes">Minutes</Label>
                <Input
                  id="edit-minutes"
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
                <Label htmlFor="edit-status">Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? WorkLogStatus.DONE)}
                    >
                      <SelectTrigger id="edit-status">
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
              <Label htmlFor="edit-output">Output (optional)</Label>
              <Textarea
                id="edit-output"
                rows={2}
                {...register("output", {
                  maxLength: { value: 2000, message: "Max 2000 characters." },
                })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
