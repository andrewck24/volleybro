import { routeRequest, silenceConsoleError } from "@/test-utils/route-request";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockTransferOwnership = jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/interface/controllers/player/ownership.controller", () => ({
  transferOwnership: mockTransferOwnership,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const NEW_OWNER_ID = "507f1f77bcf86cd799439012";
const SESSION = { user: { id: "user-1" } };

type RouteResponse = { status: number; json: () => Promise<unknown> };

let POST: (
  req: never,
  props: { params: Promise<{ teamId: string }> },
) => Promise<RouteResponse>;

describe("POST /api/teams/[teamId]/ownership", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
    ({ POST } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest(
      `http://localhost/api/teams/${VALID_OBJECT_ID}/ownership`,
      "POST",
      { newOwnerId: NEW_OWNER_ID, confirm: true },
    );
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockTransferOwnership).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The exact body handleTransferOwnership sends (src/components/team/players/membership-section.tsx):
  it("returns 200 for the payload the transfer-ownership control actually sends", async () => {
    const updated = {
      id: NEW_OWNER_ID,
      name: "New Owner",
      status: PlayerStatus.JOINED,
      role: PlayerRole.OWNER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockTransferOwnership.mockResolvedValue(updated);
    const req = routeRequest(
      `http://localhost/api/teams/${VALID_OBJECT_ID}/ownership`,
      "POST",
      { newOwnerId: NEW_OWNER_ID },
    );
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(updated);
    expect(mockTransferOwnership).toHaveBeenCalledWith({
      teamId: VALID_OBJECT_ID,
      newOwnerId: NEW_OWNER_ID,
      userId: SESSION.user.id,
    });
  });
});
