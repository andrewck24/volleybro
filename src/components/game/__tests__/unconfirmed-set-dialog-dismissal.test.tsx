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

// A set with no confirmed result on a fresh start is what raises the dialog.
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

  // Blocking the primitive's own exits still leaves the back gesture, which
  // on a phone is the way out of anything.
  it("asks before letting the back gesture leave, and stays put on cancel", async () => {
    const user = userEvent.setup();
    renderDialog();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(push).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "留在這裡" }));
    expect(push).not.toHaveBeenCalled();
  });

  // popstate covers the back gesture; only beforeunload covers a reload or a
  // closed tab, and the queue is memory-only so that exit loses the write.
  it("also warns the browser before a reload or a closed tab", () => {
    renderDialog();

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
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
