import { routeRequest, silenceConsoleError } from "@/test-utils/route-request";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockCreateGameController =
  jest.fn<(input: unknown) => Promise<unknown>>();
const mockFindGameSummariesController =
  jest.fn<(input: unknown) => Promise<unknown>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/game/game.controller", () => ({
  createGameController: mockCreateGameController,
}));

jest.mock("@/interface/controllers/game/game-summary.controller", () => ({
  findGameSummariesController: mockFindGameSummariesController,
}));

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

let GET: (
  req: never,
) => Promise<{ status: number; json: () => Promise<unknown> }>;
let POST: (
  req: never,
) => Promise<{ status: number; json: () => Promise<unknown> }>;

describe("GET /api/games", () => {
  beforeAll(async () => {
    ({ GET } = await import("../route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
  });

  it("returns 400 when teamId query is missing", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest("http://localhost/api/games", "GET");

    const res = await GET(req as never);
    const body = (await res.json()) as { reason: string; detail: string };

    expect(res.status).toBe(400);
    expect(body.reason).toBe("INVALID_INPUT");
    expect(mockFindGameSummariesController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("calls controller with teamId, lastId, and limit params", async () => {
    const summaries = { gameSummaries: [], hasMore: false, lastId: "" };
    const req = routeRequest(
      "http://localhost/api/games?ti=team-1&li=last-1&lm=5",
      "GET",
    );
    mockFindGameSummariesController.mockResolvedValue(summaries);

    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(summaries);
    expect(mockFindGameSummariesController).toHaveBeenCalledWith({
      params: { teamId: "team-1", lastId: "last-1", limit: 5 },
    });
  });

  it("uses default limit of 10 when not provided", async () => {
    const summaries = { gameSummaries: [], hasMore: false, lastId: "" };
    const req = routeRequest("http://localhost/api/games?ti=team-1", "GET");
    mockFindGameSummariesController.mockResolvedValue(summaries);

    await GET(req as never);

    expect(mockFindGameSummariesController).toHaveBeenCalledWith({
      params: { teamId: "team-1", lastId: undefined, limit: 10 },
    });
  });
});

describe("POST /api/games", () => {
  beforeAll(async () => {
    ({ POST } = await import("../route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
  });

  it("returns 400 when teamId query is missing", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest("http://localhost/api/games", "POST", {
      info: { title: "Game 1" },
      teams: {},
    });

    const res = await POST(req as never);
    const body = (await res.json()) as { reason: string; detail: string };

    expect(res.status).toBe(400);
    expect(body.reason).toBe("INVALID_INPUT");
    expect(body.detail).toBe("teamId is required");
    expect(mockCreateGameController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("creates game when teamId query is provided", async () => {
    const createdGame = { id: "game-1" };
    const body = {
      info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
      teams: {
        home: { name: "A", players: [] },
        away: { name: "B" },
      },
    };
    const req = routeRequest(
      "http://localhost/api/games?ti=team-1",
      "POST",
      body,
    );
    mockCreateGameController.mockResolvedValue(createdGame);

    const res = await POST(req as never);
    const resBody = await res.json();

    expect(res.status).toBe(201);
    expect(resBody).toEqual(createdGame);
    expect(mockConnectToMongoDB).toHaveBeenCalled();
    expect(mockCreateGameController).toHaveBeenCalledWith({
      params: { teamId: "team-1" },
      data: body,
    });
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest("http://localhost/api/games?ti=team-1", "POST", {
      info: { title: "Game 1" },
      teams: {},
    });

    const res = await POST(req as never);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockCreateGameController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
