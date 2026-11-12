import { UnconfirmedSetDialog } from "@/components/game/unconfirmed-set-dialog";
import type { GameView } from "@/lib/features/game/types";
import { makeStore } from "@/lib/redux/store";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

describe("UnconfirmedSetDialog dismissal", () => {
  beforeEach(() => push.mockClear());

  it("stays open on escape and outside click, and has no close button", async () => {
    const user = userEvent.setup();
    renderDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    fireEvent.pointerDown(document.body);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "關閉" }),
    ).not.toBeInTheDocument();
  });

  it("confirms popstate navigation separately from dialog dismissal", async () => {
    const user = userEvent.setup();
    renderDialog();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(push).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("button", { name: "仍要離開" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "留在這裡" }));
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

    expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
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
