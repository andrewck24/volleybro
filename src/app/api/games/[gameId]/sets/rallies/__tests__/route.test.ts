import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockRecordRalliesController =
  jest.fn<(input: unknown) => Promise<unknown>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/game/rally.controller", () => ({
  recordRalliesController: mockRecordRalliesController,
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
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn<() => Promise<Headers>>().mockResolvedValue(new Headers()),
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";

type RouteResponse = { status: number; json: () => Promise<unknown> };

let PUT: (
  req: never,
  props: { params: Promise<{ gameId: string }> },
) => Promise<RouteResponse>;

describe("PUT /api/games/[gameId]/sets/rallies", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    ({ PUT } = await import("../route"));
  });

  it("returns 400 when the body is not an array", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: `http://localhost/api/games/${VALID_OBJECT_ID}/sets/rallies`,
      method: "PUT",
      nextUrl: { searchParams: new URLSearchParams() },
      json: async () => ({}),
    };
    const props = { params: Promise.resolve({ gameId: VALID_OBJECT_ID }) };

    const res = await PUT(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockRecordRalliesController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
