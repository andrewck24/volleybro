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

const filesStillCarryingComments = [
  ".changeset/changelog-fn.js",
  ".changeset/changelog-postprocess.js",
  ".storybook/main.ts",
  ".storybook/preview.tsx",
  "blueprint/content/design-system/_shared.tsx",
  "blueprint/content/design-system/brand/index.tsx",
  "blueprint/content/design-system/color/index.tsx",
  "blueprint/content/design-system/elevation-depth/index.tsx",
  "blueprint/src/components/annotated-diff.tsx",
  "blueprint/src/components/brand/logo-symbol.tsx",
  "blueprint/src/components/brand/logo-type.tsx",
  "blueprint/src/components/card-list.tsx",
  "blueprint/src/components/change-header.test.tsx",
  "blueprint/src/components/decision-timeline.tsx",
  "blueprint/src/components/risk-table.test.tsx",
  "blueprint/src/components/status-badge.tsx",
  "blueprint/src/lib/change-artifact.test.ts",
  "blueprint/src/lib/change-artifact.ts",
  "blueprint/src/lib/changes-tree.ts",
  "blueprint/src/lib/cloudflare-deploy-hook.test.ts",
  "blueprint/src/lib/cloudflare-deploy-hook.ts",
  "blueprint/src/lib/decision-record.locale.test.ts",
  "blueprint/src/lib/decision-record.ts",
  "blueprint/src/lib/decisions-index.ts",
  "blueprint/src/lib/decisions-tree.test.ts",
  "blueprint/src/lib/emdash-change-record.test.ts",
  "blueprint/src/lib/emdash-change-record.ts",
  "blueprint/src/lib/emdash-publication-policy.test.ts",
  "blueprint/src/lib/emdash-publication-policy.ts",
  "blueprint/src/lib/github-change-data.ts",
  "blueprint/src/lib/heading-anchors.ts",
  "blueprint/src/lib/highlight-html.tsx",
  "blueprint/src/lib/page-tree.ts",
  "blueprint/src/middleware.test.ts",
  "commitlint.config.js",
  "docs/migrations/migrate-legacy-accounts.js",
  "docs/migrations/migrate-team-owner.js",
  "jest.config.ts",
  "next.config.ts",
  "playwright.config.ts",
  "scripts/__tests__/chromatic-scope.test.js",
  "scripts/__tests__/release-controls-authorization.test.js",
  "scripts/__tests__/release-controls-compatibility.test.js",
  "scripts/__tests__/release-controls-gates.test.js",
  "scripts/__tests__/release-controls-promotion.test.js",
  "scripts/__tests__/release-controls-smoke.test.js",
  "scripts/__tests__/release-controls-trust-path.test.js",
  "scripts/assert-sw.js",
  "scripts/blueprint.js",
  "scripts/check-workflow.js",
  "scripts/chromatic-scope.js",
  "scripts/commitlint/plugin.js",
  "scripts/generate-icons.js",
  "scripts/guard-pr-merge.js",
  "scripts/pr-wait.js",
  "scripts/release-controls.js",
  "scripts/release-controls/authorize.js",
  "scripts/release-controls/core.js",
  "scripts/release-controls/finalize.js",
  "scripts/release-controls/promote.js",
  "scripts/release-controls/stage.js",
  "scripts/verify.js",
  "src/__tests__/proxy.test.ts",
  "src/app/\\(tabs\\)/@modal/\\(...\\)team/new/__tests__/page.test.tsx",
  "src/app/api/games/\\[gameId\\]/sets/__tests__/route.test.ts",
  "src/app/api/players/\\[playerId\\]/__tests__/route.test.ts",
  "src/app/api/players/\\[playerId\\]/invitations/__tests__/route.test.ts",
  "src/app/api/players/\\[playerId\\]/memberships/__tests__/route.test.ts",
  "src/app/api/teams/\\[teamId\\]/__tests__/route.test.ts",
  "src/app/api/teams/\\[teamId\\]/ownership/__tests__/route.test.ts",
  "src/app/api/teams/\\[teamId\\]/players/__tests__/route.test.ts",
  "src/app/layout.tsx",
  "src/applications/repositories/player.repository.interface.ts",
  "src/applications/usecases/player/create-player.usecase.ts",
  "src/components/game/__tests__/gesture-integration.test.tsx",
  "src/components/game/__tests__/summary-drawer.test.tsx",
  "src/components/game/entry/index.tsx",
  "src/components/game/header/sync-indicator.tsx",
  "src/components/game/panel/__tests__/index.test.tsx",
  "src/components/game/sets/index.tsx",
  "src/components/landing/__tests__/rally.test.tsx",
  "src/components/landing/copy.ts",
  "src/components/landing/diff-chart.tsx",
  "src/components/landing/rally-layer.tsx",
  "src/components/landing/stats-carousel.tsx",
  "src/components/landing/use-walkthrough.ts",
  "src/components/layout/tab-container.tsx",
  "src/components/team/info/index.tsx",
  "src/components/team/lineup/index.tsx",
  "src/components/team/players/__tests__/create-form.test.tsx",
  "src/components/team/players/create-form.tsx",
  "src/components/team/players/info.tsx",
  "src/components/team/players/membership-section.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/calendar.tsx",
  "src/hooks/__tests__/use-data.test.ts",
  "src/hooks/__tests__/use-game-merge.test.tsx",
  "src/hooks/use-data.ts",
  "src/infrastructure/db/repositories/game.repository.mongo.ts",
  "src/interface/validations/player.ts",
  "src/lib/__tests__/auth-hook.test.ts",
  "src/lib/auth-hook.ts",
  "src/lib/auth.ts",
  "src/proxy.ts",
  "src/stories/game/header.stories.tsx",
  "test/e2e/session.e2e.ts",
  "test/integration/api/game-set-completion.itest.ts",
  "test/integration/api/game-substitution.itest.ts",
  "test/integration/support/seed.ts",
  "test/setup/integration.ts",
  "test/support/dom/user-agent.ts",
  "test/support/fixtures/lineup-game.ts",
  "test/support/react/render-game.tsx",
  "test/support/release-controls-fixture.js",
];

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
  {
    files: filesStillCarryingComments,
    rules: { "local/no-comments": "off" },
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
