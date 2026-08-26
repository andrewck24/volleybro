import { UnconfirmedSetDialog } from "@/components/game/unconfirmed-set-dialog";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// Proves UnconfirmedSetDialog's DialogContent actually receives handlers
// that block every dismissal route -- escape, outside click, and the close
// button, and the back gesture. Content/state behavior is
// covered by unconfirmed-set-dialog.test.tsx against the real dialog; this
// only checks the three exits are wired to reject dismissal.
let capturedProps: {
  closeButton?: boolean;
  onEscapeKeyDown?: (e: { preventDefault: () => void }) => void;
  onInteractOutside?: (e: { preventDefault: () => void }) => void;
} = {};
jest.mock("@/components/ui/dialog", () => {
  const actual = jest.requireActual("@/components/ui/dialog");
  return {
    ...actual,
    DialogContent: (props: typeof capturedProps & { children?: unknown }) => {
      capturedProps = props;
      return <div>{props.children as React.ReactNode}</div>;
    },
  };
});

jest.mock("@/hooks/use-unconfirmed-set-completion", () => ({
  useUnconfirmedSetCompletion: () => ({
    unconfirmed: true,
    attempting: false,
    retry: jest.fn(),
  }),
}));

describe("UnconfirmedSetDialog dismissal", () => {
  beforeEach(() => {
    capturedProps = {};
  });

  it("blocks escape, outside click, and hides the close button", () => {
    render(<UnconfirmedSetDialog gameId="game-1" setIndex={0} />);

    expect(capturedProps.closeButton).toBe(false);

    const event = { preventDefault: jest.fn() };
    capturedProps.onEscapeKeyDown?.(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);

    const outsideEvent = { preventDefault: jest.fn() };
    capturedProps.onInteractOutside?.(outsideEvent);
    expect(outsideEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  // Blocking the primitive's own exits still leaves the back gesture, which
  // on a phone is the way out of anything.
  it("asks before letting the back gesture leave, and stays put on cancel", async () => {
    const user = userEvent.setup();
    push.mockClear();
    render(<UnconfirmedSetDialog gameId="game-1" setIndex={0} />);

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
    render(<UnconfirmedSetDialog gameId="game-1" setIndex={0} />);

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves for the game once the recorder confirms", async () => {
    const user = userEvent.setup();
    push.mockClear();
    render(<UnconfirmedSetDialog gameId="game-1" setIndex={0} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await user.click(await screen.findByRole("button", { name: "仍要離開" }));

    expect(push).toHaveBeenCalledWith("/game/game-1");
  });
});
