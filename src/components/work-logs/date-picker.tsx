"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { todayIsoDate } from "@/lib/time";

type Props = {
  value: string;
};

export function LogDatePicker({ value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!next || next === todayIsoDate()) {
      params.delete("date");
    } else {
      params.set("date", next);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?");
  };

  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-44"
      aria-label="Log date"
    />
  );
}
