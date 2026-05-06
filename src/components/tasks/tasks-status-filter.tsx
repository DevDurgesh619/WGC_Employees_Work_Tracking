"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { TaskStatus } from "@prisma/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL } from "@/components/tasks/status-badge";

const ALL = "ALL" as const;

export function TasksStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? ALL;

  const onChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?");
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All statuses</SelectItem>
        {Object.values(TaskStatus).map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
