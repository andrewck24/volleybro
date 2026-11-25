import { buttonVariants } from "@/components/ui/button";
import { UnconfirmedSetDialog } from "@/components/game/unconfirmed-set-dialog";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import type { GameView } from "@/lib/features/game/types";
import { makeStore } from "@/lib/redux/store";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const game = {
  id: "game-1",
  sets: [{ win: null, entries: [] }],
} as unknown as GameView;

const renderDialog = () =>
  render(
    <Provider store={makeStore()}>
      <SWRConfig
        value={{
          provider: () =>
            new Map([["/api/games/game-1", { data: game }]]) as never,
        }}
      >
        <UnconfirmedSetDialog gameId="game-1" setIndex={0} />
      </SWRConfig>
    </Provider>,
  );

const unsavedAlert = () =>
  screen.getByRole("alertdialog", {
    name: ERROR_MESSAGES.SERVER_ERROR.title,
  });
const leaveAlert = () =>
  screen.getByRole("alertdialog", { name: "本局結果還沒存好" });

const OUTLINE_DESTRUCTIVE = buttonVariants({
  variant: "outline-destructive",
}).split(" ");

describe("UnconfirmedSetDialog dismissal", () => {
  beforeEach(() => push.mockClear());

  it("focuses itself on open and offers retry as its only button", () => {
    renderDialog();

    expect(unsavedAlert()).toHaveFocus();
    expect(
      within(unsavedAlert())
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["重試"]);
  });

  it("confirms popstate navigation separately from dialog dismissal", async () => {
    const user = userEvent.setup();
    renderDialog();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(push).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "仍要離開" })).toHaveClass(
      ...OUTLINE_DESTRUCTIVE,
    );
    expect(screen.getAllByRole("alertdialog", { hidden: true })).toHaveLength(
      2,
    );
    await user.click(await screen.findByRole("button", { name: "留在這裡" }));
    expect(unsavedAlert()).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("confirms popstate even when dialog dismissal is blocked", async () => {
    const user = userEvent.setup();
    renderDialog();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await user.keyboard("{Escape}");
    fireEvent.pointerDown(document.body);

    expect(screen.getAllByRole("alertdialog", { hidden: true })).toHaveLength(
      2,
    );
    expect(leaveAlert()).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "仍要離開" }));
    expect(push).toHaveBeenCalledWith("/game/game-1");
  });

  it("warns on reload and tab close independently of history navigation", () => {
    renderDialog();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves for the game once the recorder confirms", async () => {
    const user = userEvent.setup();
    renderDialog();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await user.click(await screen.findByRole("button", { name: "仍要離開" }));

    expect(push).toHaveBeenCalledWith("/game/game-1");
  });
});
