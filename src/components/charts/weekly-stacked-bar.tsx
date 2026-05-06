"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMinutesAsHours } from "@/lib/time";

// Per-day, per-employee minutes — stacked vertically so the column height
// shows the team's total for that day, and the segments show who contributed.
type DayRow = {
  date: string; // YYYY-MM-DD
  // Each employee shows up as a key with minutes: { "Alice": 60, "Bob": 30 }
  [employeeName: string]: number | string;
};

type Props = {
  data: DayRow[];
  employeeNames: string[];
};

// Stable shadcn-friendly palette tied to chart-1..5 tokens. We loop after 5.
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function tooltipFormatter(value: unknown): [string, string] {
  if (typeof value !== "number") return ["", ""];
  return [formatMinutesAsHours(value), ""];
}

export function WeeklyStackedBar({ data, employeeNames }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v: number) => formatMinutesAsHours(v)}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          width={60}
        />
        <Tooltip
          formatter={tooltipFormatter}
          labelClassName="text-xs"
          contentStyle={{ borderRadius: 6, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {employeeNames.map((name, i) => (
          <Bar
            key={name}
            dataKey={name}
            stackId="employees"
            fill={PALETTE[i % PALETTE.length]}
            radius={i === employeeNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
