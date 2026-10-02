import { PlayerRole, PlayerStatus } from "@/entities/player";
import {
  toPlayer,
  toPlayerUpdateOps,
  type RawPlayer,
} from "@/infrastructure/db/repositories/player.mapping.mongo";
import { Types } from "mongoose";

describe("toPlayer", () => {
  it("turns the stored ids into strings", () => {
    const _id = new Types.ObjectId();
    const teamId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    const player = toPlayer({
      _id,
      teamId,
      userId,
      name: "Member",
      status: PlayerStatus.JOINED,
      role: PlayerRole.MEMBER,
    } as unknown as RawPlayer);

    expect(player).toMatchObject({
      id: _id.toString(),
      teamId: teamId.toString(),
      userId: userId.toString(),
    });
  });

  it("leaves out a link the document does not hold", () => {
    const player = toPlayer({
      _id: new Types.ObjectId(),
      teamId: new Types.ObjectId(),
      name: "Unlinked",
      status: PlayerStatus.NONE,
    } as unknown as RawPlayer);

    expect(player).not.toHaveProperty("userId");
  });
});

describe("toPlayerUpdateOps", () => {
  it.each([
    [
      "sets defined fields",
      { role: PlayerRole.ADMIN },
      { $set: { role: PlayerRole.ADMIN } },
    ],
    [
      "unsets fields patched to undefined",
      { userId: undefined, email: undefined },
      { $unset: { userId: "", email: "" } },
    ],
    [
      "splits a patch that does both",
      { status: PlayerStatus.NONE, userId: undefined, email: undefined },
      {
        $set: { status: PlayerStatus.NONE },
        $unset: { userId: "", email: "" },
      },
    ],
    ["writes nothing for an empty patch", {}, {}],
  ])("%s", (_name, updates, expected) => {
    expect(toPlayerUpdateOps(updates)).toEqual(expected);
  });
});
