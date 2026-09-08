import {
  CreateGameSchema,
  CreateSetSchema,
} from "@/interface/validations/game";
import {
  newGameBody,
  newGameFormDefaults,
} from "@/lib/features/game/new-game-form";
import {
  MatchInfoFormSchema,
  SetOptionsFormSchema,
  type LineupListPlayer,
  type SetOptionsFormValues,
} from "@/lib/features/game/types";
import { Position, type Lineup } from "@/entities/team";

const TEAM_ID = "507f1f77bcf86cd799439011";
const PLAYER_ID = "507f1f77bcf86cd799439012";

const roster: LineupListPlayer[] = [
  { id: PLAYER_ID, name: "Player 1", number: 1, list: "starting" },
];

const lineup: Lineup = {
  options: {
    liberoReplaceMode: 0,
    liberoReplacePosition: Position.NONE,
  },
  starting: [{ id: PLAYER_ID, position: Position.OH }],
  liberos: [],
  substitutes: [],
};

const asSent = (body: unknown) => JSON.parse(JSON.stringify(body));

describe("what the new-game form submits", () => {
  it.each([
    ["with nothing typed in", newGameFormDefaults("My Team")],
    [
      "with every optional field filled",
      {
        ...newGameFormDefaults("My Team"),
        name: "Final",
        teams: { home: { name: "My Team" }, away: { name: "Rivals" } },
        location: { city: "Taipei", hall: "Arena" },
        time: { date: new Date(), start: "10:00", end: "12:00" },
      },
    ],
  ])("passes the server's schema %s", (_label, info) => {
    expect(MatchInfoFormSchema.safeParse(info).success).toBe(true);

    const body = newGameBody({
      info,
      teamId: TEAM_ID,
      players: roster,
      lineup,
    });

    expect(CreateGameSchema.safeParse(asSent(body)).success).toBe(true);
  });
});

describe("what the set-options form submits", () => {
  it.each([
    ["with both times set", { start: "10:00", end: "" }],
    ["with the times left out entirely", undefined],
  ])("passes the server's schema %s", (_label, time) => {
    const options = { serve: "home", time } as SetOptionsFormValues;
    expect(SetOptionsFormSchema.safeParse(options).success).toBe(true);

    expect(CreateSetSchema.safeParse(asSent({ lineup, options })).success).toBe(
      true,
    );
  });

  it("is blocked by its own resolver when a time is half-filled", () => {
    const options = { serve: "home", time: { start: "10:00" } };

    expect(SetOptionsFormSchema.safeParse(options).success).toBe(false);
  });
});
