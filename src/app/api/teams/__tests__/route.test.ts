import { routeRequest, silenceConsoleError } from "@/test-utils/route-request";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockCreateTeamController =
  jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/team/team.controller", () => ({
  createTeamController: mockCreateTeamController,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

const SESSION = { user: { id: "user-1", name: "Test User" } };

type RouteResponse = { status: number; json: () => Promise<unknown> };

let POST: (req: never) => Promise<RouteResponse>;

describe("POST /api/teams", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue(SESSION);
    ({ POST } = await import("../route"));
  });

  it("returns 401 when session is missing", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockGetSession.mockResolvedValue(null);
    const req = routeRequest("http://localhost/api/teams", "POST", {
      name: "RyuJin",
      nickname: "RYUJIN",
    });

    const res = await POST(req as never);

    expect(res.status).toBe(401);
    consoleSpy.mockRestore();
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest("http://localhost/api/teams", "POST", {
      name: "RyuJin",
      nickname: "RYUJIN",
      extra: true,
    });

    const res = await POST(req as never);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockCreateTeamController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The exact body TeamForm's onSubmit sends (src/components/team/form.tsx):
  it("returns 201 for the payload the new-team form actually sends", async () => {
    const createdTeam = { id: "team-1", name: "RyuJin", nickname: "RYUJIN" };
    mockCreateTeamController.mockResolvedValue(createdTeam);
    const req = routeRequest("http://localhost/api/teams", "POST", {
      name: "RyuJin",
      nickname: "RYUJIN",
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(createdTeam);
    expect(mockCreateTeamController).toHaveBeenCalledWith({
      name: "RyuJin",
      nickname: "RYUJIN",
      userId: SESSION.user.id,
      userName: SESSION.user.name,
    });
  });
});
