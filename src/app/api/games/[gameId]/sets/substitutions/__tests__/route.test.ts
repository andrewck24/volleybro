import { routeRequest, silenceConsoleError } from "@/test-utils/route-request";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockCreateSubstitutionController =
  jest.fn<(input: unknown) => Promise<unknown>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/game/substitution.controller", () => ({
  createSubstitutionController: mockCreateSubstitutionController,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: jest.fn() } },
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";

type RouteResponse = { status: number; json: () => Promise<unknown> };

let POST: (
  req: never,
  props: { params: Promise<{ gameId: string }> },
) => Promise<RouteResponse>;

describe("POST /api/games/[gameId]/sets/substitutions", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    ({ POST } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = silenceConsoleError();
    const req = routeRequest(
      `http://localhost/api/games/${VALID_OBJECT_ID}/sets/substitutions`,
      "POST",
      {
        id: "entry-1",
        seq: 0,
        team: 1,
        players: { in: VALID_OBJECT_ID, out: VALID_OBJECT_ID },
        extra: true,
      },
    );
    const props = { params: Promise.resolve({ gameId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockCreateSubstitutionController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
