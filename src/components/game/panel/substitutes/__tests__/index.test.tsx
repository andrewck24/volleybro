import { Substitutes } from "@/components/game/panel/substitutes";
import { ApiClientError } from "@/lib/api/api-client";
import * as apiClientModule from "@/lib/api/api-client";
import { gameActions } from "@/lib/features/game/game-slice";
import { makeStore, type AppStore } from "@/lib/redux/store";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));

jest.mock("@/lib/features/game/hooks/use-substitutes", () => ({
  useSubstitutes: () => [],
}));

const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Stands in for SWR's bound mutate, which settles with the promise it is given.
const mutate = jest.fn((data: unknown) => data);
jest.mock("@/hooks/use-data", () => ({
  useGame: () => ({ game: mockGame, mutate }),
}));

const baseGame = {
  id: "game-1",
  info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: { home: { players: [{ id: "p1", number: 4 }] } },
  sets: [
    {
      options: { serve: "home" },
      lineups: {
        home: {
          options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
          starting: [{ id: "p1", position: "OH" }],
          liberos: [],
          substitutes: [{ id: "p2", position: "" }],
        },
      },
      entries: [],
    },
  ],
};
let mockGame: typeof baseGame = baseGame;

let store: AppStore;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

beforeEach(() => {
  store = makeStore();
  mockGame = baseGame;
  mutate.mockClear();
  mockToast.mockClear();
  (apiClientModule.apiClient as jest.Mock).mockReset();
  (apiClientModule.apiClient as jest.Mock).mockRejectedValue(
    new ApiClientError("network down", {
      code: "TRANSIENT",
      reason: "NETWORK_ERROR",
      status: 503,
    }),
  );

  store.dispatch(
    gameActions.initialize({ game: baseGame as never, setIndex: 0 }),
  );
  store.dispatch(gameActions.setEntryDraftPlayer({ id: "p1", zone: 1 }));
  store.dispatch(gameActions.setEntryDraftSubstitution("p2"));
});

describe("Substitutes.onSubmit", () => {
  it("shows an error toast when the mutate write rejects", async () => {
    const { mode } = store.getState().game;
    expect(store.getState().game[mode].entryDraft.substitution).toEqual({
      team: expect.anything(),
      players: { in: "p2", out: "p1" },
    });
    expect(typeof store.getState().game[mode].status.entryIndex).toBe("number");

    render(<Substitutes gameId="game-1" mode={mode} />, { wrapper });

    expect(mockToast).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /確認/ }));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });
});
