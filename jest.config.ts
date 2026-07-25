/**
 * Jest configuration with three projects:
 * - backend: node environment, mongoose mocked, for entities/applications/infrastructure/interface/API-route unit tests
 * - frontend: jsdom environment for components and lib
 * - integration: node environment against a real in-memory MongoDB (no mongoose mock)
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { Config } from "jest";
import nextJest from "next/jest.js";

// Next's server modules (pulled in by the integration project's real route
// imports) capture globalThis.AsyncLocalStorage at import time and otherwise use
// a stub that throws on use. They load in the real Node context, so expose it on
// the real global here (covers in-band runs) and forward it into forked Jest
// workers via NODE_OPTIONS (covers the default parallel runner).
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??=
  AsyncLocalStorage;
const preload = `${process.cwd()}/jest.preload.integration.mjs`;
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
    },
    transformIgnorePatterns: [
      "/node_modules/(?!.*(inversify|@inversifyjs)/)",
      "^.+\\.module\\.(css|sass|scss)$",
    ],
    testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
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
    setupFilesAfterEnv: ["<rootDir>/jest.setup.backend.ts"],
    testMatch: [
      "<rootDir>/src/entities/**/*.{spec,test}.{js,jsx,ts,tsx}",
      "<rootDir>/src/applications/**/*.{spec,test}.{js,jsx,ts,tsx}",
      "<rootDir>/src/infrastructure/**/*.{spec,test}.{js,jsx,ts,tsx}",
      "<rootDir>/src/interface/**/*.{spec,test}.{js,jsx,ts,tsx}",
      "<rootDir>/src/app/api/**/*.{spec,test}.{js,jsx,ts,tsx}",
      "<rootDir>/src/app/apple-splash/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ],
  };

  const frontendProject: Config = {
    ...sharedConfig,
    displayName: "frontend",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.frontend.ts"],
    testMatch: [
      "<rootDir>/src/components/**/*.{spec,test}.{js,jsx,ts,tsx}",
      "<rootDir>/src/lib/**/*.{spec,test}.{js,jsx,ts,tsx}",
      "<rootDir>/src/hooks/**/*.{spec,test}.{js,jsx,ts,tsx}",
      "<rootDir>/src/app/\\(tabs\\)/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ],
  };

  const integrationProject: Config = {
    ...sharedConfig,
    displayName: "integration",
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.integration.ts"],
    testMatch: ["<rootDir>/test/integration/**/*.itest.{js,jsx,ts,tsx}"],
  };

  return {
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageProvider: "v8",
    projects: [backendProject, frontendProject, integrationProject],
  } satisfies Config;
}
