import { routeRequest, silenceConsoleError } from "@/test-utils/route-request";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockCreateInvitation = jest.fn<(input: unknown) => Promise<unknown>>();
const mockUpdateRole = jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/interface/controllers/player/membership.controller", () => ({
  createInvitation: mockCreateInvitation,
  updateRole: mockUpdateRole,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const SESSION = { user: { id: "user-1" } };

type RouteResponse = { status: number; json: () => Promise<unknown> };

let POST: (
  req: never,
  props: { params: Promise<{ playerId: string }> },
) => Promise<RouteResponse>;
let PATCH: (
  req: never,
  props: { params: Promise<{ playerId: string }> },
) => Promise<RouteResponse>;

describe("POST /api/players/[playerId]/memberships", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
    ({ POST } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest(
      `http://localhost/api/players/${VALID_OBJECT_ID}/memberships`,
      "POST",
      {
        email: "test@example.com",
        role: PlayerRole.MEMBER,
        message: "please join",
      },
    );
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockCreateInvitation).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The exact body InviteSection's handleInvite sends (src/components/team/players/membership-section.tsx):
  it("returns 201 for the payload the invite form actually sends", async () => {
    const invited = {
      id: VALID_OBJECT_ID,
      name: "Pure Player",
      status: PlayerStatus.INVITED,
      role: PlayerRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateInvitation.mockResolvedValue(invited);
    const req = routeRequest(
      `http://localhost/api/players/${VALID_OBJECT_ID}/memberships`,
      "POST",
      {
        email: "test@example.com",
        role: PlayerRole.MEMBER,
      },
    );
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(invited);
    expect(mockCreateInvitation).toHaveBeenCalledWith({
      playerId: VALID_OBJECT_ID,
      email: "test@example.com",
      role: PlayerRole.MEMBER,
      userId: SESSION.user.id,
    });
  });
});

describe("PATCH /api/players/[playerId]/memberships", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
    ({ PATCH } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest(
      `http://localhost/api/players/${VALID_OBJECT_ID}/memberships`,
      "PATCH",
      { role: PlayerRole.ADMIN, requestedBy: "user-1" },
    );
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockUpdateRole).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The exact body JoinedSection's handleUpdateRole sends (src/components/team/players/membership-section.tsx):
  it("returns 200 for the payload the role-change control actually sends", async () => {
    const updated = {
      id: VALID_OBJECT_ID,
      name: "Player",
      status: PlayerStatus.JOINED,
      role: PlayerRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUpdateRole.mockResolvedValue(updated);
    const req = routeRequest(
      `http://localhost/api/players/${VALID_OBJECT_ID}/memberships`,
      "PATCH",
      { role: PlayerRole.ADMIN },
    );
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(updated);
    expect(mockUpdateRole).toHaveBeenCalledWith({
      playerId: VALID_OBJECT_ID,
      newRole: PlayerRole.ADMIN,
      userId: SESSION.user.id,
    });
  });
});
