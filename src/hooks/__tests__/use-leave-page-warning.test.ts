import {
  useLeavePageWarning,
  suppressLeaveWarning,
} from "@/hooks/use-leave-page-warning";
import { renderHook } from "@testing-library/react";

describe("useLeavePageWarning", () => {
  let addSpy: jest.SpyInstance;
  let removeSpy: jest.SpyInstance;

  beforeEach(() => {
    addSpy = jest.spyOn(window, "addEventListener");
    removeSpy = jest.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("adds beforeunload listener when isDirty is true", () => {
    renderHook(() => useLeavePageWarning(true));

    const calls = addSpy.mock.calls.filter(
      ([event]) => event === "beforeunload",
    );
    expect(calls).toHaveLength(1);
  });

  it("does not add beforeunload listener when isDirty is false on initial mount", () => {
    renderHook(() => useLeavePageWarning(false));

    const calls = addSpy.mock.calls.filter(
      ([event]) => event === "beforeunload",
    );
    expect(calls).toHaveLength(0);
  });

  it("removes beforeunload listener when isDirty changes from true to false", () => {
    let isDirty = true;
    const { rerender } = renderHook(() => useLeavePageWarning(isDirty));

    isDirty = false;
    rerender();

    const removeCalls = removeSpy.mock.calls.filter(
      ([event]) => event === "beforeunload",
    );
    expect(removeCalls.length).toBeGreaterThan(0);
  });

  it("removes listener on unmount", () => {
    const { unmount } = renderHook(() => useLeavePageWarning(true));

    const beforeUnmount = removeSpy.mock.calls.filter(
      ([event]) => event === "beforeunload",
    ).length;
    unmount();
    const afterUnmount = removeSpy.mock.calls.filter(
      ([event]) => event === "beforeunload",
    ).length;

    expect(afterUnmount).toBeGreaterThan(beforeUnmount);
  });

  it("suppressLeaveWarning() causes the next beforeunload event to skip preventDefault", () => {
    renderHook(() => useLeavePageWarning(true));

    const handler = addSpy.mock.calls.find(
      ([event]) => event === "beforeunload",
    )?.[1] as (e: BeforeUnloadEvent) => void;

    suppressLeaveWarning();

    const event = { preventDefault: jest.fn() } as unknown as BeforeUnloadEvent;
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.returnValue).toBeUndefined();
  });

  it("suppression is one-shot: the following beforeunload event behaves normally", () => {
    renderHook(() => useLeavePageWarning(true));

    const handler = addSpy.mock.calls.find(
      ([event]) => event === "beforeunload",
    )?.[1] as (e: BeforeUnloadEvent) => void;

    suppressLeaveWarning();
    const firstEvent = { preventDefault: jest.fn() } as unknown as BeforeUnloadEvent;
    handler(firstEvent);

    const secondEvent = { preventDefault: jest.fn() } as unknown as BeforeUnloadEvent;
    handler(secondEvent);

    expect(secondEvent.preventDefault).toHaveBeenCalled();
    expect(secondEvent.returnValue).toBe("");
  });
});
