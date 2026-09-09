import {
  AuthReason,
  CommonReason,
  GameReason,
  PlayerReason,
  ProfileReason,
} from "@/entities/errors";
import { ABSORBED_REASONS, ERROR_MESSAGES } from "@/lib/api/error-messages";

const allReasons = [
  ...Object.values(AuthReason),
  ...Object.values(CommonReason),
  ...Object.values(GameReason),
  ...Object.values(PlayerReason),
  ...Object.values(ProfileReason),
];

describe("error-messages catalogue", () => {
  it("covers every reason with either a catalogue entry or an absorption", () => {
    const uncovered = allReasons.filter(
      (reason) =>
        !(reason in ERROR_MESSAGES) &&
        !(ABSORBED_REASONS as readonly string[]).includes(reason),
    );
    expect(uncovered).toEqual([]);
  });

  it("has no overlap between ABSORBED_REASONS and catalogue entries", () => {
    const overlap = ABSORBED_REASONS.filter(
      (reason) => reason in ERROR_MESSAGES,
    );
    expect(overlap).toEqual([]);
  });
});
