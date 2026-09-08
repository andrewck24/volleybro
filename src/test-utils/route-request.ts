/**
 * Route handlers read four things off a request. Building that literal by hand
 * in every test made the body — the only part that varies — the hardest part
 * of the test to find.
 *
 * Call sites add `as never`: the handlers under test are imported dynamically
 * and typed with `req: never`, which is what lets them skip a real NextRequest.
 */
export function routeRequest(url: string, method: string, body: unknown) {
  return {
    url,
    method,
    nextUrl: { searchParams: new URL(url, "http://localhost").searchParams },
    json: async () => body,
  };
}

/** A rejected request logs its ZodError; the assertions are on the response. */
export function silenceConsoleError() {
  return jest.spyOn(console, "error").mockImplementation(() => {});
}
