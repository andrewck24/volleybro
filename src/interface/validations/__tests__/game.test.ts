import { MatchCategory, MoveType, Side } from "@/entities/game";
import { scoringMoves } from "@/lib/scoring-moves";
import {
  CreateGameSchema,
  CreateSetSchema,
  CreateSubstitutionSchema,
  RecordRalliesSchema,
} from "../game";

const OID = "507f1f77bcf86cd799439011";

const gameBody = () => ({
  info: {
    category: MatchCategory.SENIOR,
    scoring: { setCount: 5, decidingSetPoints: 15 },
  },
  teams: {
    home: { id: OID, name: "Home", players: [] },
    away: { name: "Away" },
  },
});

const rally = () => ({
  id: "r1",
  seq: 0,
  win: true,
  home: { score: 1, type: MoveType.ATTACK, num: 0 },
  away: { score: 0, type: MoveType.ATTACK, num: 0 },
});

const lineup = () => ({
  options: {
    liberoReplaceMode: 0 as const,
    liberoReplacePosition: "" as const,
  },
  starting: [],
  liberos: [],
  substitutes: [],
});

describe("CreateGameSchema", () => {
  it("accepts an away team carrying only a name", () => {
    expect(() => CreateGameSchema.parse(gameBody())).not.toThrow();
  });

  it("accepts the unnamed opponent the new-game form submits by default", () => {
    const body = gameBody();
    body.teams.away.name = "";
    expect(() => CreateGameSchema.parse(body)).not.toThrow();
  });

  it("requires a roster on home but not on away", () => {
    const body = gameBody();
    delete (body.teams.home as { players?: unknown }).players;
    expect(() => CreateGameSchema.parse(body)).toThrow();
  });

  it("keeps rejecting undeclared fields on the derived away schema", () => {
    const body = gameBody();
    (body.teams.away as Record<string, unknown>).coach = "someone";
    expect(() => CreateGameSchema.parse(body)).toThrow();
  });

  it("rejects a home id that is not an ObjectId", () => {
    const body = gameBody();
    body.teams.home.id = "not-an-id";
    expect(() => CreateGameSchema.parse(body)).toThrow();
  });

  it("rejects an undeclared field nested inside info", () => {
    const body = gameBody();
    (body.info as Record<string, unknown>).weather = { temperature: 25 };
    expect(() => CreateGameSchema.parse(body)).toThrow();
  });

  it("rejects a number sent as a string instead of coercing it", () => {
    const body = gameBody();
    body.info.scoring.setCount = "5" as unknown as number;
    expect(() => CreateGameSchema.parse(body)).toThrow();
  });

  it("turns an ISO date string into a Date", () => {
    const body = gameBody();
    (body.info as Record<string, unknown>).time = {
      date: "2026-01-01T00:00:00.000Z",
    };
    const parsed = CreateGameSchema.parse(body);
    expect(parsed.info.time?.date).toBeInstanceOf(Date);
  });
});

describe("RecordRalliesSchema", () => {
  it.each([
    ["turns the recorder's empty player id into null", "", null],
    ["leaves a real player id alone", OID, OID],
  ])("%s", (_label, sent, stored) => {
    const r = rally();
    (r.home as Record<string, unknown>).player = { id: sent, zone: 1 };
    const [parsed] = RecordRalliesSchema.parse([r]);
    expect(parsed?.home.player?.id).toBe(stored);
  });

  it("rejects a player id that is neither empty nor an ObjectId", () => {
    const r = rally();
    (r.home as Record<string, unknown>).player = { id: "nope", zone: 1 };
    expect(() => RecordRalliesSchema.parse([r])).toThrow();
  });

  it("bounds num by the scoring-moves table", () => {
    const ok = rally();
    ok.home.num = scoringMoves.length - 1;
    expect(() => RecordRalliesSchema.parse([ok])).not.toThrow();

    const over = rally();
    over.home.num = scoringMoves.length;
    expect(() => RecordRalliesSchema.parse([over])).toThrow();
  });

  it("rejects a body that is not an array", () => {
    expect(() => RecordRalliesSchema.parse({})).toThrow();
  });
});

describe("CreateSetSchema", () => {
  it("rejects an empty string where a lineup player id belongs", () => {
    const body = {
      lineup: { ...lineup(), starting: [{ id: "" }] },
      options: { serve: "home" as const },
    };
    expect(() => CreateSetSchema.parse(body)).toThrow();
  });

  it("rejects an undeclared field nested inside a lineup player", () => {
    const body = {
      lineup: { ...lineup(), starting: [{ id: OID, extra: true }] },
      options: { serve: "home" as const },
    };
    expect(() => CreateSetSchema.parse(body)).toThrow();
  });
});

describe("CreateSubstitutionSchema", () => {
  it("rejects an empty string for either substituted player", () => {
    const body = {
      id: "s1",
      seq: 0,
      team: Side.HOME,
      players: { in: "", out: OID },
    };
    expect(() => CreateSubstitutionSchema.parse(body)).toThrow();
  });
});
