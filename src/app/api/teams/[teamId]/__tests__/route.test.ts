import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockGetTeamController =
  jest.fn<(teamId: string) => Promise<Record<string, unknown> | null>>();
const mockUpdateTeamController =
  jest.fn<(teamId: string, data: unknown) => Promise<Record<string, unknown>>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();
const mockContainerGet = jest.fn<() => unknown>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/team/get-team.controller", () => ({
  getTeamController: mockGetTeamController,
}));

jest.mock("@/interface/controllers/team/update-team.controller", () => ({
  updateTeamController: mockUpdateTeamController,
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
      getSession: mockGetSession,
    },
  },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn<() => Promise<Headers>>().mockResolvedValue(new Headers()),
}));

jest.mock("@/infrastructure/di/inversify.config", () => ({
  container: { get: mockContainerGet },
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";

type RouteResponse = { status: number; json: () => Promise<unknown> };

let GET: (
  req: never,
  props: { params: Promise<{ teamId: string }> },
) => Promise<RouteResponse>;

let PATCH: (
  req: never,
  props: { params: Promise<{ teamId: string }> },
) => Promise<RouteResponse>;

describe("GET /api/teams/[teamId]", () => {
  beforeAll(async () => {
    ({ GET, PATCH } = await import("../route"));
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
    expect(mockGetTeamController).not.toHaveBeenCalled();
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
    mockGetTeamController.mockResolvedValue(null);
    const req = { url: `http://localhost/api/teams/${VALID_OBJECT_ID}`, method: "GET" };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await GET(req as never, props);
    const body = (await res.json()) as { code: string; reason: string };

    expect(res.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(mockGetTeamController).toHaveBeenCalledWith(VALID_OBJECT_ID);
    consoleSpy.mockRestore();
  });

  it("returns 200 with team data when team found", async () => {
    const team = { id: VALID_OBJECT_ID, name: "Test Team" };
    mockGetTeamController.mockResolvedValue(team);
    const req = { url: `http://localhost/api/teams/${VALID_OBJECT_ID}`, method: "GET" };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await GET(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(team);
  });
});

describe("PATCH /api/teams/[teamId]", () => {
  const SESSION = { user: { id: "user-1" } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue(SESSION);
    mockContainerGet.mockReturnValue({
      verifyIsTeamAdmin: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });
  });

  it("returns 401 when session is missing", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockGetSession.mockResolvedValue(null);
    const req = {
      url: `http://localhost/api/teams/${VALID_OBJECT_ID}`,
      method: "PATCH",
      json: async () => ({ name: "New Name" }),
    };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);

    expect(res.status).toBe(401);
    consoleSpy.mockRestore();
  });

  it("returns 400 when teamId is not a valid ObjectId", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = {
      url: "http://localhost/api/teams/bad-id",
      method: "PATCH",
      json: async () => ({ name: "New Name" }),
    };
    const props = { params: Promise.resolve({ teamId: "bad-id" }) };

    const res = await PATCH(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    consoleSpy.mockRestore();
  });

  it("returns 200 with updated team on valid request", async () => {
    const updated = { id: VALID_OBJECT_ID, name: "New Name" };
    mockUpdateTeamController.mockResolvedValue(updated);
    const req = {
      url: `http://localhost/api/teams/${VALID_OBJECT_ID}`,
      method: "PATCH",
      json: async () => ({ name: "New Name" }),
    };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(updated);
    expect(mockUpdateTeamController).toHaveBeenCalledWith(VALID_OBJECT_ID, {
      name: "New Name",
      nickname: undefined,
    });
  });
});
