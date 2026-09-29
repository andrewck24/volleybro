import { http } from "msw";
import { server } from "./server";

export type RallyPut = { si: string | null; body: unknown };

/**
 * Answers `PUT /api/games/game-1/sets/rallies` and records each request. The
 * Nth request gets the Nth responder; the last responder answers every later one.
 */
export const answerRallies = (
  ...responders: ((put: RallyPut, n: number) => Response | Promise<Response>)[]
) => {
  const puts: RallyPut[] = [];
  server.use(
    http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
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
