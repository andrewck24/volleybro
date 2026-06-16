import { ValidationError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export function assertObjectId(id: string, param = "id"): void {
  if (!OBJECT_ID_RE.test(id)) {
    throw new ValidationError(
      CommonReason.INVALID_INPUT,
      `Invalid ${param} format`,
    );
  }
}
