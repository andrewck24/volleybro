import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jestDom from "eslint-plugin-jest-dom";
import storybook from "eslint-plugin-storybook";
import testingLibrary from "eslint-plugin-testing-library";
import { defineConfig, globalIgnores } from "eslint/config";

const noComments = {
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === "Shebang") continue;
          context.report({
            loc: comment.loc,
            message: "Comments are not allowed.",
          });
        }
      },
    };
  },
};

const testsAssertingSerializedSvgMarkup = [
  "blueprint/src/components/diagram.test.tsx",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...storybook.configs["flat/recommended"],
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
  {
    files: testsAssertingSerializedSvgMarkup,
    rules: { "testing-library/no-node-access": "off" },
  },
  {
    linterOptions: {
      noInlineConfig: true,
    },
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: { local: { rules: { "no-comments": noComments } } },
    rules: {
      "local/no-comments": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-check": false,
          "ts-expect-error": true,
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
      "no-warning-comments": [
        "error",
        { terms: ["todo", "fixme", "hack", "xxx"], location: "anywhere" },
      ],
      "@typescript-eslint/no-empty-object-type": [
        "error",
        {
          allowInterfaces: "with-single-extends",
        },
      ],
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
  globalIgnores([
    ".agent/**",
    ".agents/**",
    ".claude/**",
    "**/.next/**",
    "**/.astro/**",
    "blueprint/dist/**",
    "**/out/**",
    "**/build/**",
    "**/.source/**",
    "next-env.d.ts",
    "**/storybook-static/**",
    "coverage/**",
    "public/sw.js",
    "docs/archive/**",
    "docs/changes/archive/**",
  ]),
]);

export default eslintConfig;
