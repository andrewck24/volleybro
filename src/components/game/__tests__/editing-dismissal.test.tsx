import { GameOptions } from "@/components/game/options";
import { SetEdit } from "@/components/game/sets/edit";
import { Dialog } from "@/components/ui/dialog";
import {
  holdEditedWrite,
  renderEditingGame,
} from "@test/support/react/render-editing-game";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";

const Host = ({
  onOpenChange,
  children,
}: {
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setOpen(next);
      }}
    >
      {children}
    </Dialog>
  );
};

describe.each([
  [
    "GameOptions",
    <GameOptions
      key="options"
      gameId="game-1"
      tabValue="overview"
      setTabValue={() => {}}
    />,
  ],
  ["SetEdit", <SetEdit key="set" gameId="game-1" setIndex={0} />],
])("%s editing dismissal", (_name, dialogBody) => {
  it("cannot be dismissed by escape or an outside click while the edit is being written", async () => {
    const onOpenChange = jest.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { store } = renderEditingGame(
      <Host onOpenChange={onOpenChange}>{dialogBody}</Host>,
    );
    holdEditedWrite(store);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await user.click(document.body);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(store.getState().game.mode).toBe("editing");
  });

  it("leaves editing mode when the dialog closes", async () => {
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    const { store } = renderEditingGame(
      <Host onOpenChange={onOpenChange}>{dialogBody}</Host>,
    );
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(store.getState().game.mode).toBe("general"));
  });
});
