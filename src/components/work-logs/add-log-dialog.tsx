"use client";

import { useState, useTransition } from "react";

import { WorkLogStatus } from "@prisma/client";
import { Plus } from "lucide-react";
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
import { createWorkLog } from "@/server/actions/work-logs";
import { todayIsoDate } from "@/lib/time";

type TaskOption = { id: string; title: string };

type Props = {
  date: string;
  tasks: TaskOption[];
};

const FREE_TEXT_VALUE = "__FREE_TEXT__";

type FormValues = {
  taskChoice: string; // task id, or FREE_TEXT_VALUE
  freeTextTask: string;
  description: string;
  minutes: string;
  output: string;
  status: WorkLogStatus;
};

export function AddLogDialog({ date, tasks }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultChoice = tasks[0]?.id ?? FREE_TEXT_VALUE;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      taskChoice: defaultChoice,
      freeTextTask: "",
      description: "",
      minutes: "",
      output: "",
      status: WorkLogStatus.DONE,
    },
  });

  const taskChoice = watch("taskChoice");
  const isFreeText = taskChoice === FREE_TEXT_VALUE;

  const onSubmit = (values: FormValues) => {
    setServerError(null);

    const payload = {
      date,
      taskId: isFreeText ? undefined : values.taskChoice,
      freeTextTask: isFreeText ? values.freeTextTask : undefined,
      description: values.description,
      minutes: values.minutes,
      output: values.output || undefined,
      status: values.status,
    };

    startTransition(async () => {
      const result = await createWorkLog(payload);
      if (!result.ok) {
        const message = result.message ?? "Could not save log.";
        setServerError(message);
        toast.error(message);
        return;
      }
      toast.success(`Logged ${result.data.minutes} minutes.`);
      reset({
        taskChoice: defaultChoice,
        freeTextTask: "",
        description: "",
        minutes: "",
        output: "",
        status: WorkLogStatus.DONE,
      });
      setOpen(false);
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        Add log
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setServerError(null);
            reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add work log</DialogTitle>
            <DialogDescription>
              Logging for{" "}
              <span className="font-medium">
                {date}
                {date === todayIsoDate() ? " (today)" : ""}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="taskChoice">Task</Label>
              <Controller
                control={control}
                name="taskChoice"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger id="taskChoice">
                      <SelectValue placeholder="Pick a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((t) => (
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
                  {...register("minutes", {
                    required: "Minutes are required.",
                    valueAsNumber: false,
                  })}
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

            {serverError ? (
              <p className="text-destructive text-sm" role="alert">
                {serverError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save log"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
