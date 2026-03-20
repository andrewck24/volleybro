import type { AppError } from "@/entities/errors/app-error";

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
