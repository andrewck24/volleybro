/**
 * Jest configuration with three projects:
 * - backend: node environment, no database, for entities/applications/infrastructure/interface/API-route unit tests
 * - frontend: jsdom environment for components and lib
 * - integration: node environment against a real in-memory MongoDB replica set
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { pathToFileURL } from "node:url";
import type { Config } from "jest";
import nextJest from "next/jest.js";

// Next's server modules (pulled in by the integration project's real route
// imports) capture globalThis.AsyncLocalStorage at import time and otherwise use
// a stub that throws on use. They load in the real Node context, so expose it on
// the real global here (covers in-band runs) and forward it into forked Jest
// workers via NODE_OPTIONS (covers the default parallel runner).
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??=
  AsyncLocalStorage;
const preload = pathToFileURL(
  `${process.cwd()}/test/setup/integration.preload.js`,
).href;
if (!process.env.NODE_OPTIONS?.includes(preload)) {
  process.env.NODE_OPTIONS =
    `${process.env.NODE_OPTIONS ?? ""} --import ${preload}`.trim();
}

const createJestConfig = nextJest({ dir: "./" });

// next/jest resolves transform/moduleNameMapper; inject into each project for TS support
export default async function jestConfig() {
  const nextResolved = await createJestConfig({})();

  const sharedConfig: Partial<Config> = {
    transform: nextResolved.transform,
    moduleNameMapper: {
      ...nextResolved.moduleNameMapper,
      "^@/(.*)$": "<rootDir>/src/$1",
      // The migration scripts run under ts-node/esm, which requires the `.js`
      // specifier the TypeScript source does not have on disk.
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transformIgnorePatterns: [
      "/node_modules/(?!.*(inversify|@inversifyjs|msw|@mswjs|rettime|until-async|@open-draft|cookie)/)",
      "^.+\\.module\\.(css|sass|scss)$",
    ],
    testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
    // verify:all runs the integration tests beside the app build, which
    // rewrites .next/ while Jest's module map is reading it.
    modulePathIgnorePatterns: ["<rootDir>/.next/"],
    collectCoverageFrom: [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/types/**/*",
    ],
  };

  const backendProject: Config = {
    ...sharedConfig,
    displayName: "backend",
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/test/setup/backend.ts"],
    testMatch: [
      "<rootDir>/src/entities/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/applications/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/infrastructure/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/interface/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/app/api/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/app/apple-splash/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/__tests__/**/*.test.{js,jsx,ts,tsx}",
    ],
  };

  const frontendProject: Config = {
    ...sharedConfig,
    displayName: "frontend",
    // jsdom hides Node's fetch, Request and Response, which MSW intercepts.
    testEnvironment: "jest-fixed-jsdom",
    setupFilesAfterEnv: ["<rootDir>/test/setup/frontend.ts"],
    testMatch: [
      "<rootDir>/src/components/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/lib/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/hooks/**/*.test.{js,jsx,ts,tsx}",
      "<rootDir>/src/app/[(]tabs[)]/**/*.test.{js,jsx,ts,tsx}",
    ],
  };

  const integrationProject: Config = {
    ...sharedConfig,
    displayName: "integration",
    testEnvironment: "node",
    globalSetup: "<rootDir>/test/setup/integration.global.ts",
    globalTeardown: "<rootDir>/test/setup/integration.teardown.ts",
    setupFilesAfterEnv: ["<rootDir>/test/setup/integration.ts"],
    testMatch: ["<rootDir>/test/integration/**/*.itest.{js,jsx,ts,tsx}"],
  };

  return {
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageProvider: "v8",
    projects: [backendProject, frontendProject, integrationProject],
  } satisfies Config;
}
