import { ApiClientError } from "@/lib/api/api-client";
import * as apiClientModule from "@/lib/api/api-client";
import { createSubstitution } from "@/lib/features/game/actions/create-substitution";
import type { GameView, SubstitutionView } from "@/lib/features/game/types";

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));

const apiClient = apiClientModule.apiClient as jest.Mock;

describe("createSubstitution", () => {
  const params = { gameId: "game-1", setIndex: 0, entryIndex: 2 };
  const substitution = {} as SubstitutionView;
  const makeGame = (): GameView =>
    ({ sets: [{ entries: [] }] }) as unknown as GameView;

  afterEach(() => jest.resetAllMocks());

  it("goes through the shared HTTP client instead of raw fetch", async () => {
    apiClient.mockResolvedValue([{ id: "e1" }]);
    const game = makeGame();

    await createSubstitution(params, substitution, game);

    expect(apiClient).toHaveBeenCalledWith(
      "/api/games/game-1/sets/substitutions?si=0&ei=2",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(substitution),
      }),
    );
  });

  it("writes the returned entries onto the active set", async () => {
    const entries = [{ id: "e1" }];
    apiClient.mockResolvedValue(entries);
    const game = makeGame();

    const result = await createSubstitution(params, substitution, game);

    expect(result!.sets[0]!.entries).toBe(entries);
  });

  it("rethrows on failure instead of swallowing the error", async () => {
    const error = new ApiClientError("boom", {
      code: "VALIDATION",
      reason: "INVALID_INPUT",
      detail: "boom",
      status: 400,
    });
    apiClient.mockRejectedValue(error);

    await expect(
      createSubstitution(params, substitution, makeGame()),
    ).rejects.toBe(error);
  });
});
