/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const commonConfig = {
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  preset: "ts-jest",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

const config: Config = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  projects: [
    {
      ...commonConfig,
      displayName: "frontend",
      testEnvironment: "jest-environment-jsdom",
      testMatch: [
        "<rootDir>/src/components/**/*.{spec,test}.{js,jsx,ts,tsx}",
        "<rootDir>/src/app/**/!(api)/**/*.{spec,test}.{js,jsx,ts,tsx}",
      ],
    },
    {
      ...commonConfig,
      displayName: "backend",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/src/app/api/**/*.{spec,test}.{js,jsx,ts,tsx}",
        "<rootDir>/src/applications/**/*.{spec,test}.{js,jsx,ts,tsx}",
        "<rootDir>/src/entities/**/*.{spec,test}.{js,jsx,ts,tsx}",
        "<rootDir>/src/infrastructure/**/*.{spec,test}.{js,jsx,ts,tsx}",
        "<rootDir>/src/interfaces/**/*.{spec,test}.{js,jsx,ts,tsx}",
        "<rootDir>/src/lib/**/*.{spec,test}.{js,jsx,ts,tsx}",
      ],
    },
  ],
};

export default createJestConfig(config);
