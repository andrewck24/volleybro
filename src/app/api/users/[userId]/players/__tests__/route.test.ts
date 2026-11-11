import {
  routeRequest,
  silenceConsoleError,
} from "@test/support/http/route-request";
import { createPlayer } from "@test/support/fixtures/entities";
import { PlayerRole } from "@/entities/player";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGetUserPlayers = jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/interface/controllers/player/player.controller", () => ({
  getUserPlayersController: mockGetUserPlayers,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

const SESSION = { user: { id: "user-1", email: "user1@example.com" } };

type RouteResponse = { status: number; json: () => Promise<unknown> };

let GET: (
  req: never,
  props: { params: Promise<{ userId: string }> },
) => Promise<RouteResponse>;

describe("GET /api/users/[userId]/players", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
    mockGetUserPlayers.mockResolvedValue([]);
    ({ GET } = await import("../route"));
  });

  it("returns 403 when the signed-in user requests another user's players", async () => {
    const consoleSpy = silenceConsoleError();

    try {
      const req = routeRequest(
        "http://localhost/api/users/user-2/players",
        "GET",
      );
      const props = { params: Promise.resolve({ userId: "user-2" }) };

      const res = await GET(req as never, props);

      expect(res.status).toBe(403);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("returns what the controller finds for the session email", async () => {
    mockGetUserPlayers.mockImplementation(async (input) =>
      (input as { email: string }).email === "user1@example.com"
        ? [{ ...createPlayer({ id: "player-9", name: "Invited" }) }]
        : [],
    );
    const req = routeRequest(
      "http://localhost/api/users/user-1/players",
      "GET",
    );
    const props = { params: Promise.resolve({ userId: "user-1" }) };

    const res = await GET(req as never, props);

    expect(await res.json()).toMatchObject([{ id: "player-9" }]);
  });

  it("returns the requested user's players when the signed-in user owns them", async () => {
    const player = {
      ...createPlayer({
        id: "player-1",
        name: "User One",
        role: PlayerRole.ADMIN,
      }),
      teamName: "Team One",
    };
    mockGetUserPlayers.mockResolvedValue([player]);
    const req = routeRequest(
      "http://localhost/api/users/user-1/players",
      "GET",
    );
    const props = { params: Promise.resolve({ userId: "user-1" }) };

    const res = await GET(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject([
      {
        id: "player-1",
        name: "User One",
        role: PlayerRole.ADMIN,
        teamName: "Team One",
        userId: "user-1",
      },
    ]);
  });
});
