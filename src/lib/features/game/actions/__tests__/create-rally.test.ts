import { ApiClientError } from "@/lib/api/api-client";
import * as apiClientModule from "@/lib/api/api-client";
import { createRally } from "@/lib/features/game/actions/create-rally";
import type { GameView, RallyView } from "@/lib/features/game/types";

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));

const apiClient = apiClientModule.apiClient as jest.Mock;

describe("createRally", () => {
  const params = { gameId: "game-1", setIndex: 0 };
  const entryDraft = {} as RallyView;
  const makeGame = (): GameView =>
    ({ sets: [{ entries: [] }] }) as unknown as GameView;

  afterEach(() => jest.resetAllMocks());

  it("goes through the shared HTTP client with one or more entries", async () => {
    apiClient.mockResolvedValue({ entries: [{ id: "e1" }] });
    const game = makeGame();

    await createRally(params, entryDraft, game);

    expect(apiClient).toHaveBeenCalledWith(
      "/api/games/game-1/sets/rallies?si=0",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify([entryDraft]),
      }),
    );
  });

  it("writes the returned entries onto the active set", async () => {
    const entries = [{ id: "e1" }];
    apiClient.mockResolvedValue({ entries });
    const game = makeGame();

    const result = await createRally(params, entryDraft, game);

    expect(result.sets[0]!.entries).toBe(entries);
  });

  it("rethrows the ApiClientError so the optimistic mutate rolls back", async () => {
    const error = new ApiClientError("boom", {
      code: "VALIDATION",
      reason: "INVALID_INPUT",
      detail: "boom",
      status: 400,
    });
    apiClient.mockRejectedValue(error);

    await expect(createRally(params, entryDraft, makeGame())).rejects.toBe(
      error,
    );
  });
});
