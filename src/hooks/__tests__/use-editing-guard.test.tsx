import { useEditingGuard } from "@/hooks/use-editing-guard";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { act, renderHook, screen } from "@testing-library/react";
import { Provider } from "react-redux";

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    {children}
    <Toaster />
  </Provider>
);

const enterEditing = (entryId: string) => {
  store.dispatch(
    gameActions.setEditingEntryStatus({
      game: {
        info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
        sets: [
          {
            options: { serve: "home" },
            entries: [
              {
                id: entryId,
                seq: 0,
                type: "Rally",
                win: true,
                home: { score: 1, type: 2, num: 0, player: { id: "p1" } },
                away: { score: 0 },
              },
            ],
          },
        ],
      } as never,
      entryIndex: 0,
    }),
  );
};

beforeEach(() => {
  store = makeStore();
});

afterEach(() => {
  const { result } = renderHook(() => useToast());
  act(() => result.current.dismiss());
});

describe("useEditingGuard", () => {
  it("is inert outside editing mode", () => {
    const { result } = renderHook(() => useEditingGuard(), { wrapper });

    expect(result.current.writing).toBe(false);
    expect(result.current.failed).toBe(false);

    const event = { preventDefault: jest.fn() };
    act(() => result.current.guardDismiss(event));
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("reports writing while the edit's write has a scheduled attempt, and blocks dismissal", () => {
    act(() => enterEditing("e1"));
    act(() => store.dispatch(gameActions.editWriteStaged("e1")));
    act(() =>
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { id: "e1", seq: 0 } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      ),
    );

    const { result } = renderHook(() => useEditingGuard(), { wrapper });
    expect(result.current.writing).toBe(true);
    expect(result.current.failed).toBe(false);

    const event = { preventDefault: jest.fn() };
    act(() => result.current.guardDismiss(event));
    expect(event.preventDefault).toHaveBeenCalledTimes(1);

    act(() => result.current.leaveEditing());
    expect(store.getState().game.mode).toBe("editing");
    expect(screen.queryByText("編輯未儲存")).not.toBeInTheDocument();
  });

  it("reports failed once attempts are exhausted, allows dismissal, and tells the recorder on leave", () => {
    act(() => enterEditing("e1"));
    act(() => store.dispatch(gameActions.editWriteStaged("e1")));
    act(() =>
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { id: "e1", seq: 0 } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      ),
    );
    act(() =>
      store.dispatch(
        pendingWritesActions.flushFailed({
          keys: ["e1"],
          retryable: false,
          lastError: { code: "VALIDATION", reason: "BAD_REQUEST", status: 400 },
        }),
      ),
    );

    const { result } = renderHook(() => useEditingGuard(), { wrapper });
    expect(result.current.writing).toBe(false);
    expect(result.current.failed).toBe(true);

    const event = { preventDefault: jest.fn() };
    act(() => result.current.guardDismiss(event));
    expect(event.preventDefault).not.toHaveBeenCalled();

    act(() => result.current.leaveEditing());
    expect(store.getState().game.mode).toBe("general");
    expect(screen.getByText("編輯未儲存")).toBeInTheDocument();
  });

  it("tells the recorder on leave when background retries ran out, not only when the server refused", () => {
    act(() => enterEditing("e1"));
    act(() => store.dispatch(gameActions.editWriteStaged("e1")));
    act(() =>
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { id: "e1", seq: 0 } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      ),
    );
    for (let attempt = 0; attempt < 4; attempt++)
      act(() =>
        store.dispatch(
          pendingWritesActions.flushFailed({
            keys: ["e1"],
            retryable: true,
            lastError: { code: "TRANSIENT", reason: "NETWORK", status: 503 },
          }),
        ),
      );

    const { result } = renderHook(() => useEditingGuard(), { wrapper });
    act(() => result.current.leaveEditing());

    expect(store.getState().game.mode).toBe("general");
    expect(screen.getByText("編輯未儲存")).toBeInTheDocument();
  });

  it("lets the edit close while only the entry's creation write is still scheduled", () => {
    act(() => enterEditing("e1"));
    act(() =>
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { id: "e1", seq: 0, at: "2026-01-01T09:00:00.000Z" } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      ),
    );

    const { result } = renderHook(() => useEditingGuard(), { wrapper });
    expect(result.current.writing).toBe(false);
    const event = { preventDefault: jest.fn() };
    act(() => result.current.guardDismiss(event));
    expect(event.preventDefault).not.toHaveBeenCalled();
    act(() => result.current.leaveEditing());

    expect(store.getState().game.mode).toBe("general");
    expect(screen.queryByText("編輯未儲存")).not.toBeInTheDocument();
  });

  it("tells the edit's own scheduled write from an exhausted creation write of the same entry", () => {
    act(() => enterEditing("e1"));
    const creation = { id: "e1", seq: 0, at: "2026-01-01T09:00:00.000Z" };
    act(() =>
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: creation as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      ),
    );
    for (let attempt = 0; attempt < 4; attempt++)
      act(() =>
        store.dispatch(
          pendingWritesActions.flushFailed({
            keys: ["e1@2026-01-01T09:00:00.000Z"],
            retryable: true,
            lastError: { code: "TRANSIENT", reason: "NETWORK", status: 503 },
          }),
        ),
      );
    act(() => {
      store.dispatch(
        gameActions.editWriteStaged("e1@2026-01-01T09:05:00.000Z"),
      );
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { ...creation, at: "2026-01-01T09:05:00.000Z" } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      );
    });

    const { result } = renderHook(() => useEditingGuard(), { wrapper });

    expect(result.current.writing).toBe(true);
    expect(result.current.failed).toBe(false);
  });

  it("leaves silently when only the entry's creation write has run out of retries", () => {
    act(() => enterEditing("e1"));
    act(() =>
      store.dispatch(
        pendingWritesActions.enqueued({
          entry: { id: "e1", seq: 0, at: "2026-01-01T09:00:00.000Z" } as never,
          gameId: "game-1",
          setIndex: 0,
        }),
      ),
    );
    for (let attempt = 0; attempt < 4; attempt++)
      act(() =>
        store.dispatch(
          pendingWritesActions.flushFailed({
            keys: ["e1@2026-01-01T09:00:00.000Z"],
            retryable: true,
            lastError: { code: "TRANSIENT", reason: "NETWORK", status: 503 },
          }),
        ),
      );

    const { result } = renderHook(() => useEditingGuard(), { wrapper });
    act(() => result.current.leaveEditing());

    expect(store.getState().game.mode).toBe("general");
    expect(screen.queryByText("編輯未儲存")).not.toBeInTheDocument();
  });

  it("leaves silently once idle (no failed write)", () => {
    act(() => enterEditing("e1"));

    const { result } = renderHook(() => useEditingGuard(), { wrapper });
    act(() => result.current.leaveEditing());

    expect(store.getState().game.mode).toBe("general");
    expect(screen.queryByText("編輯未儲存")).not.toBeInTheDocument();
  });
});
