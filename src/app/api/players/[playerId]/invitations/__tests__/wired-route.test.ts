import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockAcceptInvitation = jest.fn<(input: unknown) => Promise<unknown>>();
const mockLeaveTeam = jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/interface/controllers/player/invitation.controller", () => ({
  acceptInvitation: mockAcceptInvitation,
  leaveTeam: mockLeaveTeam,
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
  auth: { api: { getSession: mockGetSession } },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn<() => Promise<Headers>>().mockResolvedValue(new Headers()),
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const SESSION = { user: { id: "user-1" } };

type RouteResponse = { status: number; json: () => Promise<unknown> };

let PATCH: (
  req: never,
  props: { params: Promise<{ playerId: string }> },
) => Promise<RouteResponse>;

describe("PATCH /api/players/[playerId]/invitations", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
    ({ PATCH } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: `http://localhost/api/players/${VALID_OBJECT_ID}/invitations`,
      method: "PATCH",
      json: async () => ({ action: "accept", note: "sounds good" }),
    };
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockAcceptInvitation).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The exact body handleInvitation sends (src/components/user/invitations/index.tsx):
  // JSON.stringify({ action }) with action "accept" | "reject".
  it("returns 200 for the payload the invitation-response control actually sends", async () => {
    mockAcceptInvitation.mockResolvedValue(undefined);
    const req = {
      url: `http://localhost/api/players/${VALID_OBJECT_ID}/invitations`,
      method: "PATCH",
      json: async () => ({ action: "accept" }),
    };
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = (await res.json()) as { success: boolean };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockAcceptInvitation).toHaveBeenCalledWith({
      playerId: VALID_OBJECT_ID,
      userId: SESSION.user.id,
    });
  });

  // The exact body handleLeaveTeam sends (src/components/team/info/index.tsx):
  // JSON.stringify({ action: "leave" }).
  it("returns 200 for the payload the leave-team control actually sends", async () => {
    mockLeaveTeam.mockResolvedValue(undefined);
    const req = {
      url: `http://localhost/api/players/${VALID_OBJECT_ID}/invitations`,
      method: "PATCH",
      json: async () => ({ action: "leave" }),
    };
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = (await res.json()) as { success: boolean };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLeaveTeam).toHaveBeenCalledWith({
      playerId: VALID_OBJECT_ID,
      userId: SESSION.user.id,
    });
  });
});
