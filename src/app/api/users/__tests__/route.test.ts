import {
  routeRequest,
  silenceConsoleError,
} from "@test/support/http/route-request";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockSearchUserController =
  jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetUserByIdController =
  jest.fn<(input: unknown) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();

jest.mock("@/interface/controllers/user/user.controller", () => ({
  searchUserController: mockSearchUserController,
  getUserByIdController: mockGetUserByIdController,
}));

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

const SESSION = { user: { id: "user-1" } };

type RouteResponse = { status: number; json: () => Promise<unknown> };

let GET: (req: never) => Promise<RouteResponse>;
// Imported after resetModules, so it is the class the route's error handler
// checks against.
let NotFoundError: typeof import("@/entities/errors").NotFoundError;

const get = (query = "") =>
  GET(routeRequest(`http://localhost/api/users${query}`, "GET") as never);

describe("GET /api/users", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
    ({ GET } = await import("../route"));
    ({ NotFoundError } = await import("@/entities/errors"));
  });

  it("returns 401 without a session", async () => {
    const consoleSpy = silenceConsoleError();
    mockGetSession.mockResolvedValue(null);

    const res = await get();
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(401);
    expect(body.code).toBe("AUTHENTICATION");
    expect(mockGetUserByIdController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns the signed-in user when no email is given", async () => {
    const user = { id: "user-1", name: "Ann" };
    mockGetUserByIdController.mockResolvedValue({ ok: true, value: user });

    const res = await get();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(user);
    expect(mockGetUserByIdController).toHaveBeenCalledWith({
      userId: SESSION.user.id,
    });
    expect(mockSearchUserController).not.toHaveBeenCalled();
  });

  it("searches by email when one is given", async () => {
    const found = { id: "user-2" };
    mockSearchUserController.mockResolvedValue({ ok: true, value: found });

    const res = await get(
      "?email=b%40example.com&teamId=aaaaaaaaaaaaaaaaaaaaaaaa",
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(found);
    expect(mockSearchUserController).toHaveBeenCalledWith({
      email: "b@example.com",
      teamId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      userId: SESSION.user.id,
    });
    expect(mockGetUserByIdController).not.toHaveBeenCalled();
  });

  it("requires a teamId for email searches", async () => {
    const consoleSpy = silenceConsoleError();
    const res = await get("?email=b%40example.com");
    expect(res.status).toBe(400);
    expect(mockSearchUserController).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns the status of the error the controller reports", async () => {
    const consoleSpy = silenceConsoleError();
    mockSearchUserController.mockResolvedValue({
      ok: false,
      error: new NotFoundError("USER_NOT_FOUND", "User not found"),
    });

    const res = await get(
      "?email=nobody%40example.com&teamId=aaaaaaaaaaaaaaaaaaaaaaaa",
    );
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    consoleSpy.mockRestore();
  });
});
