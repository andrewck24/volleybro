import {
  routeRequest,
  silenceConsoleError,
} from "@test/support/http/route-request";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockFindGameController = jest.fn<(input: unknown) => Promise<unknown>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/game/game.controller", () => ({
  findGameController: mockFindGameController,
}));

jest.mock("@/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));

const GAME_ID = "665f1c2b9d3e4a0012345678";

type RouteResponse = { status: number; json: () => Promise<unknown> };

let GET: (req: never, props: never) => Promise<RouteResponse>;
// Imported after resetModules, so it is the class the route's error handler
// checks against.
let NotFoundError: typeof import("@/entities/errors").NotFoundError;

const get = (gameId: string) =>
  GET(
    routeRequest(`http://localhost/api/games/${gameId}`, "GET") as never,
    { params: Promise.resolve({ gameId }) } as never,
  );

describe("GET /api/games/[gameId]", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    ({ GET } = await import("../route"));
    ({ NotFoundError } = await import("@/entities/errors"));
  });

  it("returns 400 for a gameId that is not an ObjectId", async () => {
    const consoleSpy = silenceConsoleError();

    const res = await get("game-1");
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockFindGameController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns 200 with the game the controller finds", async () => {
    const game = { id: GAME_ID };
    mockFindGameController.mockResolvedValue(game);

    const res = await get(GAME_ID);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(game);
    expect(mockFindGameController).toHaveBeenCalledWith({
      params: { id: GAME_ID },
    });
  });

  it("returns 404 when the controller finds no game", async () => {
    const consoleSpy = silenceConsoleError();
    mockFindGameController.mockRejectedValue(
      new NotFoundError("GAME_NOT_FOUND", "Game not found"),
    );

    const res = await get(GAME_ID);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    consoleSpy.mockRestore();
  });
});
