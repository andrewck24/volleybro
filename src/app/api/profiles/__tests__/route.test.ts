import { routeRequest, silenceConsoleError } from "@/test-utils/route-request";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockUpdateProfileController =
  jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/user/profile.controller", () => ({
  updateProfileController: mockUpdateProfileController,
  getProfileController: jest.fn(),
  createProfileController: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

const SESSION = { user: { id: "user-1" } };
const TEAM_ID = "665f1c2b9d3e4a0012345678";

type RouteResponse = { status: number; json: () => Promise<unknown> };

let PATCH: (req: never) => Promise<RouteResponse>;

describe("PATCH /api/profiles", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue(SESSION);
    ({ PATCH } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest("http://localhost/api/profiles", "PATCH", {
      activeTeamId: TEAM_ID,
      isAdmin: true,
    });

    const res = await PATCH(req as never);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockUpdateProfileController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns 400 for an activeTeamId that is not an ObjectId", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest("http://localhost/api/profiles", "PATCH", {
      activeTeamId: "team-1",
    });

    const res = await PATCH(req as never);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockUpdateProfileController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The exact body team-switcher sends (src/components/team/team-switcher.tsx):
  it("returns 200 for the payload team-switcher actually sends", async () => {
    const profile = { userId: "user-1", activeTeamId: TEAM_ID };
    mockUpdateProfileController.mockResolvedValue(profile);
    const req = routeRequest("http://localhost/api/profiles", "PATCH", {
      activeTeamId: TEAM_ID,
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(profile);
    expect(mockUpdateProfileController).toHaveBeenCalledWith({
      userId: SESSION.user.id,
      updates: { activeTeamId: TEAM_ID },
    });
  });
});
