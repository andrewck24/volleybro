import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import type { ImageProps } from "next/image";
import React from "react";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock IntersectionObserver for motion library
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

// Mock ResizeObserver for responsive components
global.ResizeObserver = jest.fn().mockImplementation((_callback) => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock matchMedia for responsive and motion tests
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

// Mock fetch for API testing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, width, height, ...rest }: ImageProps) => {
    // Filter out special props from next/image
    const { fill, priority, quality, sizes, ...imgProps } = rest;
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement("img", {
      src: typeof src === "string" ? src : "",
      alt: alt ?? "",
      width,
      height,
      ...imgProps,
    });
  },
}));

// Mock MongoDB modules to avoid ES module issues
jest.mock("mongodb", () => ({
  MongoClient: {
    connect: jest.fn().mockResolvedValue({
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          find: jest
            .fn()
            .mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
          findOne: jest.fn().mockResolvedValue(null),
          insertOne: jest.fn().mockResolvedValue({ insertedId: "mock-id" }),
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        }),
      }),
      close: jest.fn(),
    }),
  },
  ObjectId: jest.fn().mockImplementation((id) => ({
    toString: () => id || "mock-object-id",
    toHexString: () => id || "mock-object-id",
  })),
}));

jest.mock("mongoose", () => {
  const mockObjectId = jest.fn().mockImplementation((id) => ({
    toString: () => id || "mock-object-id",
    toHexString: () => id || "mock-object-id",
  }));

  const mockSchema = jest.fn().mockImplementation(() => ({
    index: jest.fn(), // Add index method to schema instances
    plugin: jest.fn(),
    pre: jest.fn(),
    post: jest.fn(),
    methods: {},
    statics: {},
  }));

  // Add Types to the Schema constructor function
  Object.assign(mockSchema, {
    Types: {
      ObjectId: mockObjectId,
    },
  });

  const mockModel = {
    find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    findById: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findOne: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({ _id: "mock-id" }),
    findByIdAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    findByIdAndDelete: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
  };

  return {
    connect: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
    },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue(mockModel),
    models: {}, // Add models object to prevent undefined errors
    Types: {
      ObjectId: mockObjectId,
    },
  };
});

jest.mock("bson", () => ({
  ObjectId: jest.fn().mockImplementation((id) => ({
    toString: () => id || "mock-object-id",
    toHexString: () => id || "mock-object-id",
  })),
}));

// Environment variables are handled by Jest and Next.js automatically
// Specific environment variable mocks should be done in individual test files if needed

// Basic warning suppression - only for harmless third-party warnings
// TODO items are documented in CLAUDE.md and should be checked during each test run
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];

  // Only suppress truly harmless warnings that cannot be fixed immediately
  const harmlessWarnings = [
    "DeprecationWarning", // Third-party library deprecation warnings
    "Warning: ReactDOM.render is deprecated", // Testing library internal warnings
  ];

  if (harmlessWarnings.some((warning) => message?.includes(warning))) return;

  // All other warnings (including TODO items) should be visible for tracking
  originalError.call(console, ...args);
};
