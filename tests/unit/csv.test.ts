import { describe, expect, it } from "vitest";

import { csvLines, csvRow, escapeCsvField, csvStream } from "@/lib/csv";

describe("escapeCsvField", () => {
  it("returns plain values unquoted", () => {
    expect(escapeCsvField("alice")).toBe("alice");
    expect(escapeCsvField(42)).toBe("42");
  });

  it("quotes values that contain a comma", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
  });

  it("quotes and doubles internal double-quotes", () => {
    expect(escapeCsvField('She said "hi".')).toBe('"She said ""hi""."');
  });

  it("quotes values with newlines or carriage returns", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField("line1\rline2")).toBe('"line1\rline2"');
  });

  it("emits an empty cell for null and undefined", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });

  it("preserves an empty string as empty (not double-quoted)", () => {
    expect(escapeCsvField("")).toBe("");
  });
});

describe("csvRow", () => {
  it("joins fields with commas", () => {
    expect(csvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  it("escapes only the fields that need it", () => {
    expect(csvRow(["plain", "needs,quote", 'has "quote"'])).toBe(
      `plain,"needs,quote","has ""quote"""`,
    );
  });

  it("renders nulls and numbers correctly", () => {
    expect(csvRow([1, null, "ok"])).toBe("1,,ok");
  });
});

describe("csvLines (streaming)", () => {
  it("emits header first, then a row per item", async () => {
    const rows = [
      { date: "2026-05-01", description: "first" },
      { date: "2026-05-02", description: "second" },
    ];
    const out: string[] = [];
    for await (const line of csvLines(rows, ["date", "description"], (r) => [r.date, r.description])) {
      out.push(line);
    }
    expect(out[0]).toBe("date,description\n");
    expect(out[1]).toBe("2026-05-01,first\n");
    expect(out[2]).toBe("2026-05-02,second\n");
    expect(out.length).toBe(3);
  });

  it("escapes inside the formatter output", async () => {
    const rows = [{ note: 'has "quote", and comma' }];
    const out: string[] = [];
    for await (const line of csvLines(rows, ["note"], (r) => [r.note])) {
      out.push(line);
    }
    expect(out[1]).toBe('"has ""quote"", and comma"\n');
  });

  it("works with an empty source", async () => {
    const out: string[] = [];
    for await (const line of csvLines([], ["a", "b"], () => ["", ""])) {
      out.push(line);
    }
    expect(out).toEqual(["a,b\n"]);
  });
});

describe("csvStream", () => {
  it("returns a ReadableStream that yields the same bytes as csvLines", async () => {
    const rows = [{ x: 1 }, { x: 2 }];
    const stream = csvStream(rows, ["x"], (r) => [r.x]);
    const reader = stream.getReader();
    const dec = new TextDecoder();
    const chunks: string[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(dec.decode(value));
    }
    expect(chunks.join("")).toBe("x\n1\n2\n");
  });
});
