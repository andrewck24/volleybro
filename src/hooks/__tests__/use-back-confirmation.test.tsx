import { act, renderHook } from "@testing-library/react";
import { useBackConfirmation } from "@/hooks/use-back-confirmation";

const back = () => {
  window.dispatchEvent(new PopStateEvent("popstate"));
};

describe("useBackConfirmation", () => {
  it("asks instead of leaving, and keeps the trap armed for a second press", () => {
    const onLeave = jest.fn();
    const { result } = renderHook(() => useBackConfirmation(true, onLeave));

    act(back);
    expect(result.current.confirming).toBe(true);
    expect(onLeave).not.toHaveBeenCalled();

    act(() => result.current.cancelLeave());
    expect(result.current.confirming).toBe(false);

    // A trap that disarmed itself would let the next press through silently.
    act(back);
    expect(result.current.confirming).toBe(true);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("leaves once confirmed, and stops trapping", () => {
    const onLeave = jest.fn();
    const { result } = renderHook(() => useBackConfirmation(true, onLeave));

    act(back);
    act(() => result.current.confirmLeave());

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(result.current.confirming).toBe(false);

    act(back);
    expect(result.current.confirming).toBe(false);
  });

  it("does not trap while inactive", () => {
    const onLeave = jest.fn();
    const { result } = renderHook(() => useBackConfirmation(false, onLeave));

    act(back);

    expect(result.current.confirming).toBe(false);
    expect(onLeave).not.toHaveBeenCalled();
  });
});
