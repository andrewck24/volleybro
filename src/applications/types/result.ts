import type { AppError } from "@/applications/errors/app-error";

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
