import { http } from "msw";
import { server } from "./server";

export type EntryPut = { si: string | null; body: unknown };

/**
 * Answers `PUT /api/games/game-1/sets/entries` and records each request. The
 * Nth request gets the Nth responder; the last responder answers every later one.
 */
export const answerEntries = (
  ...responders: ((put: EntryPut, n: number) => Response | Promise<Response>)[]
) => {
  const puts: EntryPut[] = [];
  server.use(
    http.put("/api/games/game-1/sets/entries", async ({ request }) => {
      const put = {
        si: new URL(request.url).searchParams.get("si"),
        body: await request.json(),
      };
      puts.push(put);
      const respond = responders[Math.min(puts.length, responders.length) - 1]!;
      return respond(put, puts.length);
    }),
  );
  return puts;
};
