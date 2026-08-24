import { UnconfirmedSetDialog } from "@/components/game/unconfirmed-set-dialog";
import { render } from "@testing-library/react";

// Proves UnconfirmedSetDialog's DialogContent actually receives handlers
// that block every dismissal route -- escape, outside click, and the close
// button (D3/D4: no exit until the retry lands). Content/state behavior is
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
});
