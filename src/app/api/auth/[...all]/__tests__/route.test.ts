import { describe, expect, it, jest } from "@jest/globals";

const mockAuth = { handler: jest.fn() };
const mockGET = jest.fn();
const mockPOST = jest.fn();
const mockToNextJsHandler = jest.fn((_auth: unknown) => ({
  GET: mockGET,
  POST: mockPOST,
}));

jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("better-auth/next-js", () => ({
  toNextJsHandler: mockToNextJsHandler,
}));

// Better Auth ships ESM that Jest does not transform, so its handler factory
// is replaced; what the route owns is handing it the app's instance.
describe("/api/auth/[...all]", () => {
  it("serves GET and POST with Better Auth's handlers for the app's instance", async () => {
    const route = await import("../route");

    expect(mockToNextJsHandler).toHaveBeenCalledWith(mockAuth);
    expect(route.GET).toBe(mockGET);
    expect(route.POST).toBe(mockPOST);
  });
});
