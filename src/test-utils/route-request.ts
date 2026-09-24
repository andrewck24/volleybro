export function routeRequest(url: string, method: string, body?: unknown) {
  return {
    url,
    method,
    nextUrl: { searchParams: new URL(url, "http://localhost").searchParams },
    json: async () => body,
  };
}

export function silenceConsoleError() {
  return jest.spyOn(console, "error").mockImplementation(() => {});
}
