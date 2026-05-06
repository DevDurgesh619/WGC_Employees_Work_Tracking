"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  fromIso: string;
  toIso: string;
};

export function RangePicker({ fromIso, toIso }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: "from" | "to", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?");
  };

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="range-from" className="text-xs">
          From
        </Label>
        <Input
          id="range-from"
          type="date"
          value={fromIso}
          max={toIso}
          onChange={(e) => update("from", e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="range-to" className="text-xs">
          To
        </Label>
        <Input
          id="range-to"
          type="date"
          value={toIso}
          min={fromIso}
          onChange={(e) => update("to", e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
