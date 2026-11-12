import { GameOptions } from "@/components/game/options";
import { Dialog } from "@/components/ui/dialog";
import { makeStore } from "@/lib/redux/store";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";

describe("GameOptions", () => {
  it("exposes only the overview and settings tabs", () => {
    render(
      <Provider store={makeStore()}>
        <Dialog open>
          <GameOptions
            gameId="game-1"
            tabValue="overview"
            setTabValue={() => {}}
          />
        </Dialog>
      </Provider>,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "總覽",
      "設定",
    ]);
  });
});
