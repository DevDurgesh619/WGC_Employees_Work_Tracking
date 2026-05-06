// RFC-4180 CSV escaping. A field needs quoting if it contains a comma,
// double-quote, newline, or carriage return. Inside a quoted field, embedded
// double-quotes are doubled.

const NEEDS_QUOTING = /[",\r\n]/;

export function escapeCsvField(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw);
  if (s === "") return "";
  if (!NEEDS_QUOTING.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(",");
}

// Streamed CSV: pass an async iterable of typed rows + a header builder + a
// row formatter. The route handler wraps this in a ReadableStream so very
// large exports don't buffer the whole file in memory.
export async function* csvLines<T>(
  source: AsyncIterable<T> | Iterable<T>,
  header: string[],
  formatRow: (item: T) => (string | number | null | undefined)[],
): AsyncGenerator<string> {
  yield csvRow(header) + "\n";
  for await (const item of source as AsyncIterable<T>) {
    yield csvRow(formatRow(item)) + "\n";
  }
}

export function csvStream<T>(
  source: AsyncIterable<T> | Iterable<T>,
  header: string[],
  formatRow: (item: T) => (string | number | null | undefined)[],
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const iter = csvLines(source, header, formatRow);
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iter.next();
      if (done) controller.close();
      else controller.enqueue(enc.encode(value));
    },
  });
}
