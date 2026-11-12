import { AsyncLocalStorage } from "node:async_hooks";
import { pathToFileURL } from "node:url";
import type { Config } from "jest";
import nextJest from "next/jest.js";

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

const serverOnlyLibTests = [
  "<rootDir>/src/lib/api/__tests__/wrappers.test",
  "<rootDir>/src/lib/__tests__/auth-hook.test",
];

export default async function jestConfig() {
  const nextResolved = await createJestConfig({})();

  const sharedConfig: Partial<Config> = {
    transform: nextResolved.transform,
    moduleNameMapper: {
      ...nextResolved.moduleNameMapper,
      "^@/(.*)$": "<rootDir>/src/$1",
      "^@test/(.*)$": "<rootDir>/test/$1",
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transformIgnorePatterns: [
      "/node_modules/(?!.*(inversify|@inversifyjs|msw|@mswjs|rettime|until-async|@open-draft|cookie|pele)/)",
      "^.+\\.module\\.(css|sass|scss)$",
    ],
    testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
    modulePathIgnorePatterns: ["<rootDir>/.next/"],
    collectCoverageFrom: [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/types/**/*",
    ],
    coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/test/"],
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
      ...serverOnlyLibTests.map((test) => `${test}.{js,jsx,ts,tsx}`),
    ],
  };

  const frontendProject: Config = {
    ...sharedConfig,
    displayName: "frontend",
    testEnvironment: "jest-fixed-jsdom",
    setupFilesAfterEnv: ["<rootDir>/test/setup/frontend.ts"],
    testPathIgnorePatterns: [
      ...(sharedConfig.testPathIgnorePatterns ?? []),
      ...serverOnlyLibTests,
    ],
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
    coverageDirectory: "coverage",
    coverageProvider: "v8",
    projects: [backendProject, frontendProject, integrationProject],
  } satisfies Config;
}
