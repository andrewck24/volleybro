import { EntriesEditDialog } from "@/components/game/options/edit/dialog";
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

describe("SetEdit editing dismissal", () => {
  const dialogBody = <SetEdit gameId="game-1" setIndex={0} />;

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
    expect(store.getState().game.editing.entryDraft.id).toBeTruthy();
  });

  it("clears the edit draft when the dialog closes", async () => {
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    const { store } = renderEditingGame(
      <Host onOpenChange={onOpenChange}>{dialogBody}</Host>,
    );
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(store.getState().game.editing.entryDraft.id).toBe(""),
    );
  });
});

describe("EntriesEditDialog", () => {
  it("cannot be dismissed by escape or an outside click while the edit is being written", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { store } = renderEditingGame(<EntriesEditDialog gameId="game-1" />);
    holdEditedWrite(store);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await user.click(document.body);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(store.getState().game.editing.entryDraft.id).toBeTruthy();
  });

  it("closes the dialog and clears the edit draft on escape", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { store } = renderEditingGame(<EntriesEditDialog gameId="game-1" />);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(store.getState().game.editing.entryDraft.id).toBe(""),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
