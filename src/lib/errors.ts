import { NextResponse } from "next/server";
import type { ApiError } from "@/types";
export class AppError extends Error {
  code: string; status: number; details?: unknown;
  constructor(message: string, code = "APP_ERROR", status = 400, details?: unknown) {
    super(message); this.code = code; this.status = status; this.details = details;
  }
}
export function errorResponse(err: unknown): NextResponse<ApiError> {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: err.status });
  }
  console.error("[unhandled]", err);
  return NextResponse.json({ error: "Internal server error", code: "INTERNAL" }, { status: 500 });
}
export const Errors = {
  unauthorized: () => new AppError("Authentication required", "UNAUTHORIZED", 401),
  forbidden: (msg = "Not permitted") => new AppError(msg, "FORBIDDEN", 403),
  notFound: (what = "Resource") => new AppError(`${what} not found`, "NOT_FOUND", 404),
  badRequest: (msg: string, details?: unknown) => new AppError(msg, "BAD_REQUEST", 400, details),
  conflict: (msg: string) => new AppError(msg, "CONFLICT", 409),
  invalidPostback: (msg = "Invalid postback") => new AppError(msg, "INVALID_POSTBACK", 401),
};