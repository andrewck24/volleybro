import { GameOptions } from "@/components/game/options";
import { render } from "@testing-library/react";

// This suite proves GameOptions' DialogContent actually receives the guard's
// handlers on the props DialogContent spreads onto the Radix primitive (the
// premise the slice's Design relies on -- confirmed still true by reading
// src/components/ui/dialog.tsx, not assumed). guardDismiss/leaveEditing's own
// writing/failed logic is covered by use-editing-guard.test.tsx; this only
// checks the wiring, using controllable mocks for both.
let capturedProps: {
  onEscapeKeyDown?: (e: { preventDefault: () => void }) => void;
  onInteractOutside?: (e: { preventDefault: () => void }) => void;
  onCloseAutoFocus?: () => void;
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

jest.mock("@/components/game/options/edit", () => ({
  EntriesEdit: () => <div data-testid="entries-edit-marker" />,
}));
jest.mock("@/components/game/options/overview", () => ({
  GameOptionsOverview: () => <div data-testid="overview-marker" />,
}));

const guardDismiss = jest.fn();
const leaveEditing = jest.fn();
jest.mock("@/hooks/use-editing-guard", () => ({
  useEditingGuard: () => ({
    writing: false,
    failed: false,
    guardDismiss,
    leaveEditing,
  }),
}));

jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: () => ({ mode: "editing", setIndex: 0 }),
  useAppDispatch: () => jest.fn(),
}));

describe("GameOptions editing-guard wiring", () => {
  beforeEach(() => {
    capturedProps = {};
    guardDismiss.mockClear();
    leaveEditing.mockClear();
  });

  it("wires the guard's handlers to the dialog's escape, outside-click, and close paths", () => {
    render(
      <GameOptions
        gameId="game-1"
        tabValue="overview"
        setTabValue={jest.fn()}
      />,
    );

    expect(capturedProps.onEscapeKeyDown).toBe(guardDismiss);
    expect(capturedProps.onInteractOutside).toBe(guardDismiss);
    expect(capturedProps.onCloseAutoFocus).toBe(leaveEditing);

    // guardDismiss decides for itself whether to block; GameOptions just
    // has to call it through unconditionally on each dismissal path.
    const event = { preventDefault: jest.fn() };
    capturedProps.onEscapeKeyDown?.(event);
    expect(guardDismiss).toHaveBeenCalledWith(event);

    capturedProps.onInteractOutside?.(event);
    expect(guardDismiss).toHaveBeenCalledWith(event);

    capturedProps.onCloseAutoFocus?.();
    expect(leaveEditing).toHaveBeenCalledTimes(1);
  });
});
