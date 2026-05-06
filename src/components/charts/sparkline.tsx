// Tiny inline-SVG sparkline. We don't pull Recharts in here — Recharts is too
// heavy for an at-a-glance row-level chart, and inline SVG keeps each row
// cheap to render. Used in the founder overview to show a 7-day minutes
// trend per employee.

type Point = { date: string; minutes: number };

type Props = {
  data: Point[];
  width?: number;
  height?: number;
  strokeClassName?: string;
};

export function Sparkline({ data, width = 110, height = 28, strokeClassName }: Props) {
  if (data.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          className="stroke-muted-foreground/40"
          strokeDasharray="2 3"
          strokeWidth={1}
        />
      </svg>
    );
  }

  const max = Math.max(...data.map((d) => d.minutes), 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((d, i) => {
      const x = data.length > 1 ? i * stepX : width / 2;
      const y = height - (d.minutes / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`Last ${data.length} days, max ${max} minutes`}
    >
      <polyline
        fill="none"
        strokeWidth={1.5}
        className={strokeClassName ?? "stroke-primary"}
        points={points}
      />
      {data.length === 1 ? (
        <circle
          cx={width / 2}
          cy={height - (data[0]!.minutes / max) * height}
          r={2}
          className="fill-primary"
        />
      ) : null}
    </svg>
  );
}
