import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jestDom from "eslint-plugin-jest-dom";
import storybook from "eslint-plugin-storybook";
import testingLibrary from "eslint-plugin-testing-library";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  // Next.js core configurations (includes React and React Hooks rules)
  ...nextVitals,
  ...nextTs,

  // Storybook configuration
  ...storybook.configs["flat/recommended"],

  // Testing libraries configuration
  {
    files: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    plugins: {
      "testing-library": testingLibrary,
      "jest-dom": jestDom,
    },
    rules: {
      ...testingLibrary.configs.react.rules,
      ...jestDom.configs.recommended.rules,
    },
  },

  // Project-specific rules and overrides
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // TypeScript: Allow empty interfaces extending base (Clean Architecture repository pattern)
      "@typescript-eslint/no-empty-object-type": [
        "error",
        {
          allowInterfaces: "with-single-extends",
        },
      ],

      // TypeScript: Allow unused vars prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next
  globalIgnores([
    // Default ignores
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific ignores
    "storybook-static/**",
    "coverage/**",
    "public/sw.js", // Generated service worker by @serwist/next
    "docs/archive/**", // Archived migration scripts
    "openspec/changes/archive/**", // Archived change proposals
  ]),
]);

export default eslintConfig;
