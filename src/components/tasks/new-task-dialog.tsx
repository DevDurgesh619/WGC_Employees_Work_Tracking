"use client";

import { useState, useTransition } from "react";

import { TaskPriority } from "@prisma/client";
import { Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { EmployeeRow } from "@/server/queries/users";
import { bulkCreateTasks } from "@/server/actions/tasks";
import { bulkCreateTasksSchema, type BulkCreateTasksInput } from "@/lib/validations/task";

type Props = {
  employees: EmployeeRow[];
};

const PRIORITIES: TaskPriority[] = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];

type FormValues = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  estimatedMinutes: string;
  assigneeIds: string[];
};

export function NewTaskDialog({ employees }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      priority: TaskPriority.MEDIUM,
      dueDate: "",
      estimatedMinutes: "",
      assigneeIds: [],
    },
  });

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    const payload: BulkCreateTasksInput = bulkCreateTasksSchema.parse({
      task: {
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        dueDate: values.dueDate || undefined,
        estimatedMinutes: values.estimatedMinutes || undefined,
      },
      assigneeIds: values.assigneeIds,
    });

    startTransition(async () => {
      const result = await bulkCreateTasks(payload);
      if (!result.ok) {
        setServerError(result.message ?? "Could not create task.");
        toast.error(result.message ?? "Could not create task.");
        return;
      }
      const count = result.data.length;
      toast.success(`Created ${count} task${count === 1 ? "" : "s"}.`);
      reset();
      setOpen(false);
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        New task
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            reset();
            setServerError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Pick one or more assignees — each gets their own copy of the task.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                autoComplete="off"
                {...register("title", {
                  required: "Title is required.",
                  maxLength: { value: 120, message: "Max 120 characters." },
                })}
              />
              {errors.title ? (
                <p className="text-destructive text-sm">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" type="date" {...register("dueDate")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Estimated minutes</Label>
              <Input
                id="estimatedMinutes"
                type="number"
                min={1}
                placeholder="Optional"
                {...register("estimatedMinutes")}
              />
            </div>

            <div className="space-y-2">
              <Label>Assignees</Label>
              <Controller
                control={control}
                name="assigneeIds"
                rules={{ validate: (v) => v.length > 0 || "Pick at least one assignee." }}
                render={({ field }) => (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                    {employees.map((emp) => {
                      const checked = field.value.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="hover:bg-accent flex items-center gap-2 rounded p-1.5"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              field.onChange(
                                next
                                  ? [...field.value, emp.id]
                                  : field.value.filter((id) => id !== emp.id),
                              );
                            }}
                          />
                          <span className="text-sm">{emp.name}</span>
                          <span className="text-muted-foreground ml-auto text-xs">{emp.email}</span>
                        </label>
                      );
                    })}
                    {employees.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No active employees yet.</p>
                    ) : null}
                  </div>
                )}
              />
              {errors.assigneeIds ? (
                <p className="text-destructive text-sm">{errors.assigneeIds.message as string}</p>
              ) : null}
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
                {isPending ? "Creating…" : "Create task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
