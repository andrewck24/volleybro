import { EntriesEdit } from "@/components/game/options/edit";
import { Dialog } from "@/components/ui/dialog";
import {
  holdEditedWrite,
  renderEditingGame,
} from "@test/support/react/render-editing-game";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const renderEntriesEdit = () =>
  renderEditingGame(
    <Dialog open>
      <EntriesEdit gameId="game-1" />
    </Dialog>,
  );

describe("EntriesEdit back control", () => {
  it("leaves editing mode on tap while idle", async () => {
    const user = userEvent.setup();
    const { store } = renderEntriesEdit();

    const back = await screen.findByRole("button", { name: "back" });
    expect(back).toBeEnabled();

    await user.click(back);

    expect(store.getState().game.mode).toBe("general");
  });

  it("is disabled while a write is in flight, so it cannot be tapped away", async () => {
    const { store } = renderEntriesEdit();
    holdEditedWrite(store);

    expect(await screen.findByRole("button", { name: "back" })).toBeDisabled();
  });
});
