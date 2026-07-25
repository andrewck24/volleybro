import { NextRequest } from "next/server";

type RouteHandler = (
  req: NextRequest,
  props: { params: Promise<{ gameId: string }> },
) => Promise<Response>;

interface CallOptions {
  gameId: string;
  method: "POST" | "PUT";
  body?: unknown;
  /** search params, e.g. { si: 0, ei: 0 } */
  query?: Record<string, string | number>;
}

/**
 * Invoke a real route handler with a real NextRequest, mirroring how Next.js
 * calls it: JSON body, `?si=&ei=` search params, and awaited `params`.
 */
export const callRoute = async (
  handler: RouteHandler,
  { gameId, method, body, query = {} }: CallOptions,
): Promise<{ status: number; json: unknown }> => {
  const search = new URLSearchParams(
    Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])),
  ).toString();
  const url = `http://localhost/api/games/${gameId}/sets${search ? `?${search}` : ""}`;

  const req = new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const res = await handler(req, {
    params: Promise.resolve({ gameId }),
  });
  return { status: res.status, json: await res.json() };
};
