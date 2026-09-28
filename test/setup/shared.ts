// Mock fetch for API testing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Suppress harmless third-party warnings that clutter test output
const originalError = console.error;
const harmlessWarnings = [
  "DeprecationWarning",
  "Warning: ReactDOM.render is deprecated",
];
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === "string" ? args[0] : "";
  if (harmlessWarnings.some((warning) => message.includes(warning))) return;
  originalError.call(console, ...args);
};
