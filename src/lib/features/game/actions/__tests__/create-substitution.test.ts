import { http, HttpResponse } from "msw";
import { ApiClientError } from "@/lib/api/api-client";
import { createSubstitution } from "@/lib/features/game/actions/create-substitution";
import type { GameView, SubstitutionView } from "@/lib/features/game/types";

import { server } from "../../../../../../test/msw/server";

describe("createSubstitution", () => {
  const params = { gameId: "game-1", setIndex: 0, entryIndex: 2 };
  const substitution = { id: "sub-1" } as unknown as SubstitutionView;
  const makeGame = (): GameView =>
    ({ sets: [{ entries: [] }] }) as unknown as GameView;

  it("posts the substitution at the given set and entry index", async () => {
    let sent: { si: string | null; ei: string | null; body: unknown } | null =
      null;
    server.use(
      http.post("/api/games/game-1/sets/substitutions", async ({ request }) => {
        const { searchParams } = new URL(request.url);
        sent = {
          si: searchParams.get("si"),
          ei: searchParams.get("ei"),
          body: await request.json(),
        };
        return HttpResponse.json([{ id: "e1" }]);
      }),
    );

    await createSubstitution(params, substitution, makeGame());

    expect(sent).toEqual({ si: "0", ei: "2", body: substitution });
  });

  it("writes the returned entries onto the active set", async () => {
    const entries = [{ id: "e1" }];
    server.use(
      http.post("/api/games/game-1/sets/substitutions", () =>
        HttpResponse.json(entries),
      ),
    );

    const result = await createSubstitution(params, substitution, makeGame());

    expect(result.sets[0]!.entries).toEqual(entries);
  });

  it("rethrows on failure instead of swallowing the error", async () => {
    server.use(
      http.post("/api/games/game-1/sets/substitutions", () =>
        HttpResponse.json(
          { code: "VALIDATION", reason: "INVALID_INPUT" },
          { status: 400 },
        ),
      ),
    );

    await expect(
      createSubstitution(params, substitution, makeGame()),
    ).rejects.toMatchObject({
      constructor: ApiClientError,
      code: "VALIDATION",
      status: 400,
    });
  });
});
