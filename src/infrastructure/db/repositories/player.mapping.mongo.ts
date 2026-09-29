import {
  narrowPlayer,
  type Player,
  type PlayerFields,
} from "@/entities/player";
import type { Types } from "mongoose";

export type RawPlayer = Omit<PlayerFields, "id" | "teamId" | "userId"> & {
  _id: Types.ObjectId;
  teamId?: Types.ObjectId | null;
  userId?: Types.ObjectId | null;
};

export function toPlayer(raw: RawPlayer): Player {
  const { _id, teamId, userId, ...rest } = raw;
  return narrowPlayer({
    ...rest,
    id: _id.toString(),
    ...(teamId ? { teamId: teamId.toString() } : {}),
    ...(userId ? { userId: userId.toString() } : {}),
  });
}

/** `undefined` removes the field from the document; it does not skip it. */
export function toPlayerUpdateOps(updates: Partial<PlayerFields>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, string> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      $unset[key] = "";
    } else {
      $set[key] = value;
    }
  }

  const ops: {
    $set?: Record<string, unknown>;
    $unset?: Record<string, string>;
  } = {};
  if (Object.keys($set).length > 0) ops.$set = $set;
  if (Object.keys($unset).length > 0) ops.$unset = $unset;
  return ops;
}
