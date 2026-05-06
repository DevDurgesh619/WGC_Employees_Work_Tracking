import Link from "next/link";

import { format } from "date-fns";
import { Download } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { WeeklyStackedBar } from "@/components/charts/weekly-stacked-bar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMinutesAsHours, toIsoDate } from "@/lib/time";
import {
  getTeamOverview,
  startOfRangeDays,
  todayUtcMidnight,
  type TeamOverviewUser,
} from "@/server/queries/reports";

export const metadata = {
  title: "Team overview — Wallick Work Tracker",
};

const RANGE_DAYS = 7;

function fillDailySeries(daily: TeamOverviewUser["daily"], days: number): TeamOverviewUser["daily"] {
  // Build a continuous N-day series so the sparkline reflects gaps as zeros
  // instead of compressing the visible days.
  const today = todayUtcMidnight();
  const out: TeamOverviewUser["daily"] = [];
  const byIso = new Map(daily.map((d) => [d.date, d.minutes]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const iso = toIsoDate(d);
    out.push({ date: iso, minutes: byIso.get(iso) ?? 0 });
  }
  return out;
}

// Reshape per-user daily data into Recharts' "row per day, columns per
// employee" format so each day stacks contributions by name.
function buildStackedSeries(
  perUser: TeamOverviewUser[],
  days: number,
): { data: { date: string; [name: string]: number | string }[]; employeeNames: string[] } {
  const today = todayUtcMidnight();
  const rows: { date: string; [name: string]: number | string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    rows.push({ date: toIsoDate(d).slice(5) }); // "MM-DD" — short axis label
  }
  const employeeNames = perUser.map((u) => u.user.name);
  for (const u of perUser) {
    const byIso = new Map(u.daily.map((d) => [d.date, d.minutes]));
    rows.forEach((row, idx) => {
      const date = new Date(today.getTime() - (days - 1 - idx) * 24 * 60 * 60 * 1000);
      row[u.user.name] = byIso.get(toIsoDate(date)) ?? 0;
    });
  }
  return { data: rows, employeeNames };
}

export default async function OverviewPage() {
  const today = todayUtcMidnight();
  const from = startOfRangeDays(RANGE_DAYS - 1);
  const overview = await getTeamOverview({ from, to: today });
  const stacked = buildStackedSeries(overview.perUser, RANGE_DAYS);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Team overview</h1>
          <p className="text-muted-foreground text-sm">
            Last {RANGE_DAYS} days · {format(from, "MMM d")} – {format(today, "MMM d, yyyy")}
          </p>
        </div>
        <Link
          href={`/api/export/work-logs.csv?from=${toIsoDate(from)}&to=${toIsoDate(today)}`}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Team total time</CardDescription>
            <CardTitle className="text-3xl">
              {formatMinutesAsHours(overview.teamTotals.totalMinutes)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Active employees today</CardDescription>
            <CardTitle className="text-3xl">
              {overview.teamTotals.activeEmployeesToday} / {overview.teamTotals.totalEmployees}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Open tasks across team</CardDescription>
            <CardTitle className="text-3xl">
              {overview.perUser.reduce((s, u) => s + u.openTasks, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {overview.perUser.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{RANGE_DAYS}-day team time</CardTitle>
            <CardDescription>Stacked by employee — height shows team total for the day.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyStackedBar data={stacked.data} employeeNames={stacked.employeeNames} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Per employee</CardTitle>
          <CardDescription>
            Hours, completion, and a {RANGE_DAYS}-day trend. Click a row to drill in.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Done in range</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">In progress</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>Trend ({RANGE_DAYS}d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.perUser.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                    No active employees yet.
                  </TableCell>
                </TableRow>
              ) : (
                overview.perUser.map((row) => {
                  const series = fillDailySeries(row.daily, RANGE_DAYS);
                  return (
                    <TableRow key={row.user.id}>
                      <TableCell>
                        <Link
                          href={`/admin/employees/${row.user.id}`}
                          className="font-medium hover:underline"
                        >
                          {row.user.name}
                        </Link>
                        <p className="text-muted-foreground text-xs">{row.user.email}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMinutesAsHours(row.totalMinutes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.completedTasksInRange}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.openTasks}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.inProgressTasks}
                      </TableCell>
                      <TableCell>
                        {row.hasLoggedToday ? (
                          <Badge variant="secondary">Logged</Badge>
                        ) : (
                          <Badge variant="destructive">No log today</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Sparkline data={series} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
