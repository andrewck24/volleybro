import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockConnectToMongoDB = jest.fn<() => Promise<void>>();
const mockCreateSetController = jest.fn<(input: unknown) => Promise<unknown>>();
const mockUpdateSetController = jest.fn<(input: unknown) => Promise<unknown>>();

jest.mock("@/infrastructure/db/mongoose/connect-to-mongodb", () => ({
  connectToMongoDB: mockConnectToMongoDB,
}));

jest.mock("@/interface/controllers/game/set.controller", () => ({
  createSetController: mockCreateSetController,
  updateSetController: mockUpdateSetController,
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
const VALID_LINEUP = {
  options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
  starting: [],
  liberos: [],
  substitutes: [],
};

type RouteResponse = { status: number; json: () => Promise<unknown> };

let POST: (
  req: never,
  props: { params: Promise<{ gameId: string }> },
) => Promise<RouteResponse>;
let PUT: (
  req: never,
  props: { params: Promise<{ gameId: string }> },
) => Promise<RouteResponse>;

describe("POST /api/games/[gameId]/sets", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    ({ POST } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: `http://localhost/api/games/${VALID_OBJECT_ID}/sets`,
      method: "POST",
      nextUrl: { searchParams: new URLSearchParams() },
      json: async () => ({ lineup: {}, options: {}, extra: true }),
    };
    const props = { params: Promise.resolve({ gameId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockCreateSetController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // The entity used to reject these shapes before reading them. That guard
  // moved to the boundary, so the cases it covered move here with it.
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty object", {}],
    ["non-array starting", { ...VALID_LINEUP, starting: "nope" }],
    ["non-array liberos", { ...VALID_LINEUP, liberos: 42 }],
    ["non-array substitutes", { ...VALID_LINEUP, substitutes: null }],
  ])("returns 400 for a malformed lineup (%s)", async (_label, lineup) => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: `http://localhost/api/games/${VALID_OBJECT_ID}/sets`,
      method: "POST",
      nextUrl: { searchParams: new URLSearchParams() },
      json: async () => ({ lineup, options: { serve: "home" } }),
    };
    const props = { params: Promise.resolve({ gameId: VALID_OBJECT_ID }) };

    const res = await POST(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockCreateSetController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("PUT /api/games/[gameId]/sets", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectToMongoDB.mockResolvedValue(undefined);
    ({ PUT } = await import("../route"));
  });

  it("returns 400 for a body with an undeclared field", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const req = {
      url: `http://localhost/api/games/${VALID_OBJECT_ID}/sets`,
      method: "PUT",
      nextUrl: { searchParams: new URLSearchParams() },
      json: async () => ({ options: {}, extra: true }),
    };
    const props = { params: Promise.resolve({ gameId: VALID_OBJECT_ID }) };

    const res = await PUT(req as never, props);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
    expect(mockUpdateSetController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
