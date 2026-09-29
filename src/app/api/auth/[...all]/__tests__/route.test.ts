import { describe, expect, it, jest } from "@jest/globals";

const mockAuth = { handler: jest.fn() };
const mockGET = jest.fn();
const mockPOST = jest.fn();
const mockToNextJsHandler = jest.fn(() => ({ GET: mockGET, POST: mockPOST }));

jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("better-auth/next-js", () => ({
  toNextJsHandler: mockToNextJsHandler,
}));

// Better Auth owns every path under /api/auth; the route only hands it the
// app's configured instance.
describe("/api/auth/[...all]", () => {
  it("serves GET and POST with Better Auth's handlers for the app's instance", async () => {
    const route = await import("../route");

    expect(mockToNextJsHandler).toHaveBeenCalledWith(mockAuth);
    expect(route.GET).toBe(mockGET);
    expect(route.POST).toBe(mockPOST);
  });
});
