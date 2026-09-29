import {
  routeRequest,
  silenceConsoleError,
} from "@test/support/http/route-request";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { MoveType } from "@/entities/game";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockRecordRalliesController =
  jest.fn<(input: unknown) => Promise<unknown>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/game/rally.controller", () => ({
  recordRalliesController: mockRecordRalliesController,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: jest.fn() } },
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";

type RouteResponse = { status: number; json: () => Promise<unknown> };

let PUT: (
  req: never,
  props: { params: Promise<{ gameId: string }> },
) => Promise<RouteResponse>;

describe("PUT /api/games/[gameId]/sets/rallies", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    ({ PUT } = await import("../route"));
  });

  it("returns 400 when the body is not an array", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest(
      `http://localhost/api/games/${VALID_OBJECT_ID}/sets/rallies`,
      "PUT",
      {},
    );
    const props = { params: Promise.resolve({ gameId: VALID_OBJECT_ID }) };

    const res = await PUT(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockRecordRalliesController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  const rally = (overrides: Record<string, unknown> = {}) => ({
    id: "entry-1",
    seq: 0,
    win: true,
    home: { score: 1, type: MoveType.ATTACK, num: 4 },
    away: { score: 0, type: MoveType.DEFENSE, num: 7 },
    ...overrides,
  });

  const put = (body: unknown) =>
    PUT(
      routeRequest(
        `http://localhost/api/games/${VALID_OBJECT_ID}/sets/rallies`,
        "PUT",
        body,
      ) as never,
      { params: Promise.resolve({ gameId: VALID_OBJECT_ID }) },
    );

  it.each([
    ["names no move type", { home: { score: 1, num: 4 } }],
    [
      "names a move type outside the enum",
      { home: { score: 1, type: 99, num: 4 } },
    ],
    ["records no win", { win: undefined }],
    [
      "carries an undeclared field nested in its player",
      {
        home: {
          score: 1,
          type: MoveType.ATTACK,
          num: 4,
          player: { id: VALID_OBJECT_ID, zone: 4, list: "starting" },
        },
      },
    ],
  ])(
    "returns 400 before recording when the rally %s",
    async (_name, overrides) => {
      const consoleSpy = silenceConsoleError();

      const res = await put([rally(overrides)]);
      const body = (await res.json()) as { code: string; reason: string };

      expect(res.status).toBe(400);
      expect(body).toMatchObject({
        code: "VALIDATION",
        reason: "INVALID_INPUT",
      });
      expect(mockRecordRalliesController).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    },
  );
});
