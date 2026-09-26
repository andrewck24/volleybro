import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { Position } from "@/entities/team";
import { useReplacePosition } from "@/lib/features/team/hooks/use-replace-position";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import type { LineupView } from "@/lib/features/team/types";
import { makeStore } from "@/lib/redux/store";

const lineupOf = (
  options: LineupView["options"],
  position: Position,
): LineupView => ({
  options,
  starting: Array.from({ length: 6 }, (_, i) => ({
    id: `player-${i}`,
    position,
  })),
  liberos: [],
  substitutes: [],
});

describe("useReplacePosition", () => {
  it("reads the lineup the panel has selected", () => {
    const store = makeStore();
    store.dispatch(
      lineupActions.initialize([
        lineupOf(
          { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
          Position.OH,
        ),
        lineupOf(
          { liberoReplaceMode: 1, liberoReplacePosition: Position.MB },
          Position.OH,
        ),
      ]),
    );
    store.dispatch(lineupActions.setLineupIndex(1));

    const { result } = renderHook(() => useReplacePosition(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(result.current).toEqual({
      liberoReplaceMode: 1,
      liberoReplacePosition: Position.MB,
      hasPairedReplacePosition: false,
    });
  });
});
