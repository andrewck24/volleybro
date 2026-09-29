import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import type { ImageProps } from "next/image";
import type { LinkProps as NextLinkProps } from "next/link";
import React from "react";
import {
  clearImmediate as nodeClearImmediate,
  setImmediate as nodeSetImmediate,
} from "node:timers";

import { server } from "../support/msw/server";
import "./shared";

expect.extend(toHaveNoViolations);

// Node's fetch schedules its work with setImmediate, which jsdom hides.
globalThis.setImmediate ??= nodeSetImmediate as typeof setImmediate;
globalThis.clearImmediate ??= nodeClearImmediate;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

global.IntersectionObserver = jest
  .fn()
  .mockImplementation((_callback, options) => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
    root: options?.root || null,
    rootMargin: options?.rootMargin || "0px",
    thresholds: options?.threshold ? [options.threshold] : [0],
    takeRecords: jest.fn().mockReturnValue([]),
  }));

global.ResizeObserver = jest.fn().mockImplementation((_callback) => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
}));

// jsdom lacks the Pointer Capture API that vaul's Drawer calls on interaction.
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = jest.fn();
  HTMLElement.prototype.releasePointerCapture = jest.fn();
  HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: NextLinkProps & { children: React.ReactNode }) =>
    React.createElement("a", { href: href.toString(), ...props }, children),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, width, height, ...rest }: ImageProps) => {
    const {
      fill: _fill,
      priority: _priority,
      quality: _quality,
      sizes: _sizes,
      ...imgProps
    } = rest;

    return React.createElement("img", {
      src: typeof src === "string" ? src : "",
      alt: alt ?? "",
      width,
      height,
      ...imgProps,
    });
  },
}));
