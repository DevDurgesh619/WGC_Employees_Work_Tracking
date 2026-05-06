"use client";

import { useState, useTransition } from "react";

import { TaskPriority } from "@prisma/client";
import { Wand2 } from "lucide-react";
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
import { fulfillTaskRequest } from "@/server/actions/task-requests";

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
};

type Props = {
  requestId: string;
  requesterName: string;
  requesterMessage: string | null;
};

export function FulfillRequestDialog({ requestId, requesterName, requesterMessage }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Pre-fill the title from the requester's message — saves the founder a
  // copy-paste in the common "they said exactly what they want" case.
  const defaultTitle = requesterMessage?.slice(0, 80) ?? "";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: defaultTitle,
      description: requesterMessage ?? "",
      priority: TaskPriority.MEDIUM,
      dueDate: "",
      estimatedMinutes: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await fulfillTaskRequest(requestId, {
        task: {
          title: values.title,
          description: values.description || undefined,
          priority: values.priority,
          dueDate: values.dueDate || undefined,
          estimatedMinutes: values.estimatedMinutes || undefined,
        },
      });
      if (!result.ok) {
        const message = result.message ?? "Could not create task.";
        setServerError(message);
        toast.error(message);
        return;
      }
      toast.success(`Assigned "${result.data.task.title}" to ${requesterName}.`);
      reset();
      setOpen(false);
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Wand2 className="mr-1 h-4 w-4" />
        Fulfill
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
            <DialogTitle>Create task for {requesterName}</DialogTitle>
            <DialogDescription>
              Fulfilling closes the request and assigns the new task to {requesterName}.
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
                {isPending ? "Creating…" : "Create & assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
