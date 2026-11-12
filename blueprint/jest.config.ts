import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Config } from "jest";
import nextJest from "next/jest.js";

const blueprintRoot = path.dirname(fileURLToPath(import.meta.url));
const createJestConfig = nextJest({ dir: blueprintRoot });

export default async function jestConfig(): Promise<Config> {
  const nextResolved = await createJestConfig({})();
  const allTests = ["**/?(*.)+(spec|test).[jt]s?(x)"];
  const nodeTests = [
    "<rootDir>/build/d1-snapshot-reader.test.ts",
    "<rootDir>/build/wrangler-deploy-args.test.ts",
    "<rootDir>/src/lib/change-artifact.test.ts",
    "<rootDir>/src/lib/cloudflare-deploy-hook.test.ts",
    "<rootDir>/src/lib/emdash-change-record.test.ts",
    "<rootDir>/src/lib/emdash-publication-policy.test.ts",
    "<rootDir>/src/middleware.test.ts",
  ];
  const sharedConfig = {
    ...nextResolved,
    rootDir: blueprintRoot,
    testMatch: allTests,
    transform: nextResolved.transform,
    transformIgnorePatterns: [
      "/node_modules/(?!.*(msw|@mswjs|rettime|until-async|@open-draft|cookie|pele|github-slugger)/)",
      "^.+\\.module\\.(css|sass|scss)$",
    ],
    setupFilesAfterEnv: [path.join(blueprintRoot, "test/setup.ts")],
    moduleNameMapper: {
      ...nextResolved.moduleNameMapper,
      "^@/(.*)$": path.join(blueprintRoot, "src/$1"),
      "^@test/(.*)$": path.join(blueprintRoot, "test/$1"),
    },
  };

  return {
    projects: [
      {
        ...sharedConfig,
        displayName: "node",
        testEnvironment: "node",
        testMatch: nodeTests,
      },
      {
        ...sharedConfig,
        displayName: "jsdom",
        testEnvironment: "jest-fixed-jsdom",
        testPathIgnorePatterns: [
          ...(nextResolved.testPathIgnorePatterns ?? []),
          ...nodeTests,
        ],
      },
    ],
  };
}
