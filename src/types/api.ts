export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTERNAL";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorCode; message?: string };
