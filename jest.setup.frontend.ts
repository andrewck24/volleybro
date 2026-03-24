import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import type { ImageProps } from "next/image";
import type { LinkProps as NextLinkProps } from "next/link";
import React from "react";

import "./jest.setup.shared";

expect.extend(toHaveNoViolations);

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

// Strip motion-specific props before rendering plain HTML elements
function filterMotionProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const {
    initial: _initial,
    animate: _animate,
    exit: _exit,
    whileInView: _whileInView,
    transition: _transition,
    variants: _variants,
    viewport: _viewport,
    style: _style,
    ...rest
  } = props;
  return rest;
}

type MockComponentProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function createMotionComponent(tag: string) {
  const Component = ({ children, ...props }: MockComponentProps) =>
    React.createElement(tag, filterMotionProps(props), children);
  Component.displayName = `motion.${tag}`;
  return Component;
}

const MOTION_TAGS = ["section", "div", "h1", "p", "span"] as const;

const motionComponents = Object.fromEntries(
  MOTION_TAGS.map((tag) => [tag, createMotionComponent(tag)]),
);

jest.mock("motion/react", () => ({
  __esModule: true,
  motion: motionComponents,
  LazyMotion: ({ children }: MockComponentProps) => children,
  domAnimation: {},
  useReducedMotion: () => false,
}));

jest.mock("motion/react-m", () => ({
  __esModule: true,
  ...motionComponents,
}));
