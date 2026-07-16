import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Position } from "@/entities/team";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockUpdateTeamLineupsController =
  jest.fn<(teamId: string, lineups: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();
const mockContainerGet = jest.fn<() => unknown>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock(
  "@/interface/controllers/team/update-team-lineups.controller",
  () => ({
    updateTeamLineupsController: mockUpdateTeamLineupsController,
  }),
);

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn<() => Promise<Headers>>().mockResolvedValue(new Headers()),
}));

jest.mock("@/infrastructure/di/inversify.config", () => ({
  container: { get: mockContainerGet },
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const SESSION = { user: { id: "user-1" } };

const VALID_LINEUP = {
  options: { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
  starting: [],
  liberos: [],
  substitutes: [],
};

type RouteResponse = { status: number; json: () => Promise<unknown> };

let PATCH: (
  req: never,
  props: { params: Promise<{ teamId: string }> },
) => Promise<RouteResponse>;

describe("PATCH /api/teams/[teamId]/lineups", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue(SESSION);
    mockContainerGet.mockReturnValue({
      verifyTeamRole: jest
        .fn<() => Promise<void>>()
        .mockResolvedValue(undefined),
    });
    ({ PATCH } = await import("../route"));
  });

  it("returns 401 when session is missing", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockGetSession.mockResolvedValue(null);
    const req = {
      url: `http://localhost/api/teams/${VALID_OBJECT_ID}/lineups`,
      method: "PATCH",
      json: async () => [VALID_LINEUP],
    };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);

    expect(res.status).toBe(401);
    consoleSpy.mockRestore();
  });

  it("returns 400 when teamId is not a valid ObjectId", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: "http://localhost/api/teams/bad-id/lineups",
      method: "PATCH",
      json: async () => [VALID_LINEUP],
    };
    const props = { params: Promise.resolve({ teamId: "bad-id" }) };

    const res = await PATCH(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockConnectToMongoDB).not.toHaveBeenCalled();
    expect(mockUpdateTeamLineupsController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns 400 when payload is not an array", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: `http://localhost/api/teams/${VALID_OBJECT_ID}/lineups`,
      method: "PATCH",
      json: async () => ({ not: "an array" }),
    };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockUpdateTeamLineupsController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns 400 when lineup item has wrong liberoReplaceMode type", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const badLineup = {
      ...VALID_LINEUP,
      options: { liberoReplaceMode: "0", liberoReplacePosition: Position.NONE },
    };
    const req = {
      url: `http://localhost/api/teams/${VALID_OBJECT_ID}/lineups`,
      method: "PATCH",
      json: async () => [badLineup],
    };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);

    expect(res.status).toBe(400);
    consoleSpy.mockRestore();
  });

  it("returns 200 with saved lineups on valid request", async () => {
    const saved = [VALID_LINEUP];
    mockUpdateTeamLineupsController.mockResolvedValue(saved);
    const req = {
      url: `http://localhost/api/teams/${VALID_OBJECT_ID}/lineups`,
      method: "PATCH",
      json: async () => [VALID_LINEUP],
    };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(saved);
    expect(mockUpdateTeamLineupsController).toHaveBeenCalledWith(
      VALID_OBJECT_ID,
      [VALID_LINEUP],
    );
  });
});
