import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockTeamFindById = jest.fn<(id: string) => Promise<Record<string, unknown> | null>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/infrastructure/db/mongoose/schemas/team", () => ({
  __esModule: true,
  default: { findById: mockTeamFindById },
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

jest.mock("@/infrastructure/di/inversify.config", () => ({}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";

type RouteResponse = { status: number; json: () => Promise<unknown> };

let GET: (
  req: never,
  props: { params: Promise<{ teamId: string }> },
) => Promise<RouteResponse>;

describe("GET /api/teams/[teamId]", () => {
  beforeAll(async () => {
    ({ GET } = await import("../route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
  });

  it("returns 400 with VALIDATION code for invalid teamId format", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = { url: "http://localhost/api/teams/undefined", method: "GET" };
    const props = { params: Promise.resolve({ teamId: "undefined" }) };

    const res = await GET(req as never, props);
    const body = (await res.json()) as { code: string; reason: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockTeamFindById).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns 400 with VALIDATION code for arbitrary non-ObjectId string", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = { url: "http://localhost/api/teams/abc", method: "GET" };
    const props = { params: Promise.resolve({ teamId: "abc" }) };

    const res = await GET(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    consoleSpy.mockRestore();
  });

  it("returns 404 with NOT_FOUND code when valid ObjectId but team not found", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockTeamFindById.mockResolvedValue(null);
    const req = { url: `http://localhost/api/teams/${VALID_OBJECT_ID}`, method: "GET" };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await GET(req as never, props);
    const body = (await res.json()) as { code: string; reason: string };

    expect(res.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(mockTeamFindById).toHaveBeenCalledWith(VALID_OBJECT_ID);
    consoleSpy.mockRestore();
  });

  it("returns 200 with team data when team found", async () => {
    const team = { _id: VALID_OBJECT_ID, name: "Test Team" };
    mockTeamFindById.mockResolvedValue(team);
    const req = { url: `http://localhost/api/teams/${VALID_OBJECT_ID}`, method: "GET" };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await GET(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(team);
  });
});
