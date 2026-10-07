import { act } from "@testing-library/react";

type FakeObserver = {
  callback: IntersectionObserverCallback;
  targets: Element[];
};

/**
 * Replaces IntersectionObserver with one the test drives: `observers` lists
 * every observer the component created with its targets, and `intersect`
 * plays the browser reporting one target entering or leaving the viewport.
 */
export const mockIntersectionObserver = () => {
  const observers: FakeObserver[] = [];
  global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
    const observer: FakeObserver = { callback, targets: [] };
    observers.push(observer);
    return {
      observe: (target: Element) => observer.targets.push(target),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
  }) as never;

  const intersect = (
    observer: FakeObserver,
    target: Element,
    isIntersecting: boolean,
  ) =>
    act(() => {
      observer.callback(
        [{ target, isIntersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

  return { observers, intersect };
};
