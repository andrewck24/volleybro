import { EntriesEdit } from "@/components/game/options/edit";
import { Dialog } from "@/components/ui/dialog";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/components/game/court", () => ({
  GameCourt: () => <div data-testid="court-marker" />,
}));
jest.mock("@/components/game/preview", () => ({
  GamePreview: () => <div data-testid="preview-marker" />,
}));
jest.mock("@/components/game/panel", () => ({
  GamePanel: () => <div data-testid="panel-marker" />,
}));

const guardDismiss = jest.fn();
let leaveEditing = jest.fn();
let writing = false;
jest.mock("@/hooks/use-editing-guard", () => ({
  useEditingGuard: () => ({
    writing,
    failed: false,
    guardDismiss,
    leaveEditing,
  }),
}));

describe("EntriesEdit back control", () => {
  beforeEach(() => {
    writing = false;
    leaveEditing = jest.fn();
  });

  it("calls leaveEditing on tap while idle", async () => {
    const user = userEvent.setup();
    render(
      <Dialog open>
        <EntriesEdit gameId="game-1" />
      </Dialog>,
    );

    const back = screen.getByRole("button", { name: "back" });
    expect(back).toBeEnabled();

    await user.click(back);
    expect(leaveEditing).toHaveBeenCalledTimes(1);
  });

  it("is disabled while a write is in flight, so it cannot be tapped away", () => {
    writing = true;
    render(
      <Dialog open>
        <EntriesEdit gameId="game-1" />
      </Dialog>,
    );

    expect(screen.getByRole("button", { name: "back" })).toBeDisabled();
  });
});
