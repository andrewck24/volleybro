/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  testMatch: ["<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**/*",
  ],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
};

// next/jest prepends its own transformIgnorePatterns that ignore all node_modules.
// We must override AFTER createJestConfig resolves to allow inversify (ESM-only) to be transformed.
const resolveConfig = createJestConfig(config);

export default async function jestConfig() {
  const resolved = await resolveConfig();
  resolved.transformIgnorePatterns = [
    "/node_modules/(?!(inversify|@inversifyjs)/)",
    "^.+\\.module\\.(css|sass|scss)$",
  ];
  return resolved;
}
