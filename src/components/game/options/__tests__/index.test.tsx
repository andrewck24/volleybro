import { GameOptions } from "@/components/game/options";
import { Dialog } from "@/components/ui/dialog";
import { render, screen } from "@testing-library/react";

jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      game: {
        mode: "general",
        setIndex: 0,
        editing: { entryDraft: { id: "" } },
      },
      pendingWrites: { pending: [], flushingGameIds: [] },
    }),
  useAppDispatch: () => jest.fn(),
}));

// Overview pulls stats out of useGame; stub it so this test can stay focused
// on the tab/Summary wiring instead of overview's data shape.
jest.mock("@/components/game/options/overview", () => ({
  GameOptionsOverview: () => <div data-testid="overview-marker" />,
}));

// A marker so the test can prove GameOptions never renders the Summary list,
// regardless of which tab is requested -- it moved out into the `entry-ui`
// change's drawer (src/components/game/summary-drawer.tsx) and is no longer
// reachable from this dialog.
jest.mock("@/components/game/options/summary", () => ({
  GameOptionsSummary: () => <div data-testid="summary-marker" />,
}));

describe("GameOptions", () => {
  it("no longer renders the Summary tab or its content", () => {
    render(
      <Dialog open>
        <GameOptions
          gameId="game-1"
          tabValue="summary"
          setTabValue={jest.fn()}
        />
      </Dialog>,
    );

    expect(screen.queryByRole("tab", { name: "紀錄" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("summary-marker")).not.toBeInTheDocument();
  });

  it("only exposes overview and settings tabs", () => {
    render(
      <Dialog open>
        <GameOptions
          gameId="game-1"
          tabValue="overview"
          setTabValue={jest.fn()}
        />
      </Dialog>,
    );

    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });
});
