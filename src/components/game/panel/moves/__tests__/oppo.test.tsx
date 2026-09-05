import { useSubmitEntryDraft } from "@/components/game/panel/moves/oppo";
import { EntryType, MoveType } from "@/entities/game";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import { ApiClientError } from "@/lib/api/api-client";
import * as apiClientModule from "@/lib/api/api-client";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";

// useSubmitEntryDraft now takes enqueue/flush from its caller (Game, the
// single mounted owner of usePendingWrites) rather than mounting its own
// instance -- this stands in for that owner here.
const useTestSubmitEntryDraft = (gameId: string) => {
  const pendingWrites = usePendingWrites(gameId, 0);
  return useSubmitEntryDraft(gameId, pendingWrites);
};

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));
const apiClient = apiClientModule.apiClient as jest.Mock;

const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mutate = jest.fn((updater?: any) =>
  typeof updater === "function" ? updater(baseGame) : updater,
);
const baseGame = {
  id: "game-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: { home: { players: [{ id: "p1", number: 4 }] } },
  sets: [
    {
      options: { serve: "home" },
      entries: [
        {
          id: "e1",
          seq: 0,
          type: EntryType.RALLY,
          win: true,
          home: {
            score: 1,
            type: MoveType.SERVING,
            num: 0,
            player: { id: "p1", zone: 1 },
          },
          away: { score: 0, type: MoveType.SERVING, num: 1 },
        },
      ],
    },
  ],
};
// Reassigned by the tests that need the merged view to differ from the cache.
let mockGame: typeof baseGame = baseGame;
jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: mockGame, mutate }),
}));

const networkError = () =>
  new ApiClientError("network down", {
    code: "TRANSIENT",
    reason: "NETWORK_ERROR",
    detail: "network down",
    status: 503,
  });

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

beforeEach(() => {
  store = makeStore();
  mockGame = baseGame;
  mutate.mockReset();
  mutate.mockImplementation((updater?: unknown) =>
    typeof updater === "function"
      ? (updater as (g: unknown) => unknown)(baseGame)
      : updater,
  );
  mockToast.mockClear();
  apiClient.mockReset();
  act(() => {
    store.dispatch(
      gameActions.initialize({ game: baseGame as never, setIndex: 0 }),
    );
    store.dispatch(
      gameActions.setEditingEntryStatus({
        game: baseGame as never,
        entryIndex: 0,
      }),
    );
  });
});

// S08: the update path used to throw and roll back on a write failure,
// which surfaced as a toast -- now the editing card (GamePreview mode
// "editing") is the single place that shows this, so a failed write must
// leave the dialog in editing mode with no toast and the optimistic write
// still standing.
describe("useSubmitEntryDraft update path", () => {
  it("stays in editing mode, keeps the optimistic write, and shows no toast when the write fails", async () => {
    apiClient.mockRejectedValue(networkError());
    const { result } = renderHook(() => useTestSubmitEntryDraft("game-1"), {
      wrapper,
    });

    await act(async () => {
      await result.current();
    });

    expect(mockToast).not.toHaveBeenCalled();
    expect(store.getState().game.mode).toBe("editing");
    expect(store.getState().pendingWrites.pending).toHaveLength(1);
    // Only the initial optimistic mutate -- no second call rolling it back.
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("confirms the edit and returns to general mode once the write succeeds", async () => {
    apiClient.mockResolvedValue({ entries: [{ id: "e1" }] });
    const { result } = renderHook(() => useTestSubmitEntryDraft("game-1"), {
      wrapper,
    });

    await act(async () => {
      await result.current();
    });

    expect(mockToast).not.toHaveBeenCalled();
    expect(store.getState().game.mode).toBe("general");
    expect(store.getState().pendingWrites.pending).toHaveLength(0);
  });
});

// The seam the read model creates: `entryIndex` and the draft's identity are
// both counted off the merged view, while the write lands on the raw cache
// underneath it. Mocking `mutate` to hand back a shorter cache is what makes
// the two differ here.
describe("useSubmitEntryDraft against a cache the server has cut back", () => {
  const rawGame = {
    ...baseGame,
    sets: [{ ...baseGame.sets[0]!, entries: [] as unknown[] }],
  };

  it("writes the edited rally by its identity, leaving no gap in the cache", async () => {
    apiClient.mockResolvedValue({ entries: [{ id: "e1" }] });
    let written: typeof baseGame | undefined;
    mutate.mockImplementation((updater?: unknown) => {
      written =
        typeof updater === "function"
          ? (updater as (g: unknown) => typeof baseGame)(rawGame)
          : (updater as typeof baseGame);
      return written;
    });

    const { result } = renderHook(() => useTestSubmitEntryDraft("game-1"), {
      wrapper,
    });
    await act(async () => {
      await result.current();
    });

    const entries = written!.sets[0]!.entries;
    expect(entries.map((e) => e.id)).toEqual(["e1"]);
    expect(entries.every((e) => e !== undefined)).toBe(true);
  });

  it("throws before queuing anything when the entry is not a rally", async () => {
    const notARally = {
      ...baseGame,
      sets: [
        {
          ...baseGame.sets[0]!,
          entries: [
            { ...baseGame.sets[0]!.entries[0]!, type: EntryType.TIMEOUT },
          ],
        },
      ],
    };
    mockGame = notARally;

    const { result } = renderHook(() => useTestSubmitEntryDraft("game-1"), {
      wrapper,
    });
    await expect(
      act(async () => {
        await result.current();
      }),
    ).rejects.toThrow("Entry is not a rally");

    expect(store.getState().pendingWrites.pending).toHaveLength(0);
    expect(mutate).not.toHaveBeenCalled();
  });
});
