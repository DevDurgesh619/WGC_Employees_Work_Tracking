import { format } from "date-fns";

import { requireFounder } from "@/lib/auth";
import { csvStream } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { minutesToHours, toIsoDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoOr(raw: string | null, fallback: Date): Date {
  if (!raw || !ISO_DATE_RE.test(raw)) return fallback;
  const [y, m, d] = raw.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function rangeBoundsOr30Days(req: Request): { from: Date; to: Date; userId: string | null } {
  const url = new URL(req.url);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const defaultFrom = new Date(todayUtc.getTime() - 29 * 24 * 60 * 60 * 1000);
  return {
    from: parseIsoOr(url.searchParams.get("from"), defaultFrom),
    to: parseIsoOr(url.searchParams.get("to"), todayUtc),
    userId: url.searchParams.get("userId"),
  };
}

const HEADER = [
  "date",
  "user_email",
  "user_name",
  "task_title",
  "task_id",
  "description",
  "minutes",
  "hours",
  "output",
  "status",
];

export async function GET(req: Request) {
  await requireFounder();
  const { from, to, userId } = rangeBoundsOr30Days(req);

  const logs = await prisma.workLog.findMany({
    where: {
      deletedAt: null,
      date: { gte: from, lte: to },
      ...(userId ? { userId } : {}),
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { name: true, email: true } },
      task: { select: { title: true } },
    },
  });

  const stream = csvStream(logs, HEADER, (log) => [
    toIsoDate(log.date),
    log.user.email,
    log.user.name,
    log.task?.title ?? log.freeTextTask ?? "",
    log.taskId ?? "",
    log.description,
    log.minutes,
    minutesToHours(log.minutes),
    log.output ?? "",
    log.status,
  ]);

  const filename = `work-logs_${format(from, "yyyy-MM-dd")}_${format(to, "yyyy-MM-dd")}.csv`;
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
