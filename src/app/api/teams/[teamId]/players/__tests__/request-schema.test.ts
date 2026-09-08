import { silenceConsoleError } from "@/test-utils/route-request";
import { PlayerRole, PlayerStatus, Position } from "@/entities/player";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockCreatePlayer = jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetTeamPlayers = jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/interface/controllers/player/player.controller", () => ({
  createPlayer: mockCreatePlayer,
  getTeamPlayers: mockGetTeamPlayers,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const SESSION = { user: { id: "user-1" } };

type RouteResponse = { status: number; json: () => Promise<unknown> };

let POST: (
  req: never,
  props: { params: Promise<{ teamId: string }> },
) => Promise<RouteResponse>;

describe("POST /api/teams/[teamId]/players", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
    ({ POST } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = {
      url: `http://localhost/api/teams/${VALID_OBJECT_ID}/players`,
      method: "POST",
      json: async () => ({
        name: "陳大文",
        role: PlayerRole.MEMBER,
        list: "starting",
      }),
    };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockCreatePlayer).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The exact body CreateForm's handleSubmit sends (src/components/team/players/create-form.tsx):
  // JSON.stringify(data) where data is produced by zodResolver(CreatePlayerSchema),
  // so RHF only submits the schema's own fields and JSON.stringify drops the
  // undefined ones (unfilled email stays out of the wire body entirely).
  it("returns 201 for the payload the create-player form actually sends", async () => {
    const created = {
      id: "player-1",
      name: "陳大文",
      number: 5,
      position: Position.MB,
      status: PlayerStatus.NONE,
      role: PlayerRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreatePlayer.mockResolvedValue(created);
    const req = {
      url: `http://localhost/api/teams/${VALID_OBJECT_ID}/players`,
      method: "POST",
      json: async () => ({
        name: "陳大文",
        number: 5,
        position: Position.MB,
        role: PlayerRole.MEMBER,
      }),
    };
    const props = { params: Promise.resolve({ teamId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(created);
    expect(mockCreatePlayer).toHaveBeenCalledWith({
      teamId: VALID_OBJECT_ID,
      data: {
        name: "陳大文",
        number: 5,
        position: Position.MB,
        role: PlayerRole.MEMBER,
      },
      userId: SESSION.user.id,
    });
  });
});
