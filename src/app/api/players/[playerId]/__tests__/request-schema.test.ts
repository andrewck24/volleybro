import { silenceConsoleError } from "@/test-utils/route-request";
import { PlayerStatus, Position } from "@/entities/player";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUpdatePlayer = jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/interface/controllers/player/player.controller", () => ({
  updatePlayer: mockUpdatePlayer,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const SESSION = { user: { id: "user-1" } };

type RouteResponse = { status: number; json: () => Promise<unknown> };

let PATCH: (
  req: never,
  props: { params: Promise<{ playerId: string }> },
) => Promise<RouteResponse>;

describe("PATCH /api/players/[playerId]", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
    ({ PATCH } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = {
      url: `http://localhost/api/players/${VALID_OBJECT_ID}`,
      method: "PATCH",
      json: async () => ({ name: "新名字", email: "leak@example.com" }),
    };
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockUpdatePlayer).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The exact body InfoSection's handleSubmit sends (src/components/team/players/edit-form.tsx):
  // JSON.stringify(data) where data is produced by zodResolver(UpdatePlayerInfoSchema),
  // so it never carries more than name/number/position.
  it("returns 200 for the payload the player-edit form actually sends", async () => {
    const updated = {
      id: VALID_OBJECT_ID,
      name: "新名字",
      number: 12,
      position: Position.OH,
      status: PlayerStatus.JOINED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUpdatePlayer.mockResolvedValue(updated);
    const req = {
      url: `http://localhost/api/players/${VALID_OBJECT_ID}`,
      method: "PATCH",
      json: async () => ({
        name: "新名字",
        number: 12,
        position: Position.OH,
      }),
    };
    const props = { params: Promise.resolve({ playerId: VALID_OBJECT_ID }) };

    const res = await PATCH(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(updated);
    expect(mockUpdatePlayer).toHaveBeenCalledWith({
      playerId: VALID_OBJECT_ID,
      updates: { name: "新名字", number: 12, position: Position.OH },
      userId: SESSION.user.id,
    });
  });
});
