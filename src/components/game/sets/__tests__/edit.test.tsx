import { SetEdit } from "@/components/game/sets/edit";
import { render } from "@testing-library/react";

// Same wiring guarantee as GameOptions (editing-guard-wiring.test.tsx): the
// same EntriesEdit is reachable through this dialog too, so it needs the
// same escape/outside/close guard.
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
jest.mock("@/components/game/options/summary", () => ({
  GameOptionsSummary: () => <div data-testid="summary-marker" />,
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

describe("SetEdit editing-guard wiring", () => {
  beforeEach(() => {
    capturedProps = {};
    guardDismiss.mockClear();
    leaveEditing.mockClear();
  });

  it("wires the guard's handlers to the dialog's escape, outside-click, and close paths", () => {
    render(<SetEdit gameId="game-1" setIndex={0} />);

    expect(capturedProps.onEscapeKeyDown).toBe(guardDismiss);
    expect(capturedProps.onInteractOutside).toBe(guardDismiss);
    expect(capturedProps.onCloseAutoFocus).toBe(leaveEditing);
  });
});
