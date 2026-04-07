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

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn<() => Promise<Headers>>().mockResolvedValue(new Headers()),
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
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: "http://localhost/api/games",
      method: "GET",
      nextUrl: { searchParams: new URLSearchParams() },
    };

    const res = await GET(req as never);
    const body = (await res.json()) as { reason: string; detail: string };

    expect(res.status).toBe(400);
    expect(body.reason).toBe("INVALID_INPUT");
    expect(mockFindGameSummariesController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("calls controller with teamId, lastId, and limit params", async () => {
    const summaries = { gameSummaries: [], hasMore: false, lastId: "" };
    const req = {
      url: "http://localhost/api/games?ti=team-1&li=last-1&lm=5",
      method: "GET",
      nextUrl: {
        searchParams: new URLSearchParams("ti=team-1&li=last-1&lm=5"),
      },
    };
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
    const req = {
      url: "http://localhost/api/games?ti=team-1",
      method: "GET",
      nextUrl: { searchParams: new URLSearchParams("ti=team-1") },
    };
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
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: "http://localhost/api/games",
      method: "POST",
      nextUrl: { searchParams: new URLSearchParams() },
      json: async () => ({
        info: { title: "Game 1" },
        teams: {},
      }),
    };

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
    const req = {
      url: "http://localhost/api/games?ti=team-1",
      method: "POST",
      nextUrl: { searchParams: new URLSearchParams("ti=team-1") },
      json: async () => ({
        info: { title: "Game 1" },
        teams: { home: { name: "A" }, away: { name: "B" } },
      }),
    };
    mockCreateGameController.mockResolvedValue(createdGame);

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(createdGame);
    expect(mockConnectToMongoDB).toHaveBeenCalled();
    expect(mockCreateGameController).toHaveBeenCalledWith({
      params: { teamId: "team-1" },
      data: {
        info: { title: "Game 1" },
        teams: { home: { name: "A" }, away: { name: "B" } },
      },
    });
  });
});
