/** Call sites add `as never`: the handlers are imported dynamically and typed
 * `req: never`, which is what lets them skip building a real NextRequest. */
export function routeRequest(url: string, method: string, body?: unknown) {
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
