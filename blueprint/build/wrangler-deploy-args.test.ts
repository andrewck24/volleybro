import { wranglerDeployArgs } from "./wrangler-deploy-args.mjs";

const envSha = "a".repeat(40);
const gitSha = "b".repeat(40);

function expectTag(args: string[], sha: string) {
  expect(args).toEqual([
    "exec",
    "wrangler",
    "deploy",
    "--config",
    "dist/server/wrangler.json",
    "--tag",
    sha,
    "--message",
    `source ${sha}`,
  ]);
}

describe("wranglerDeployArgs", () => {
  it("tags the deployment with the commit Workers Builds reports", () => {
    expectTag(
      wranglerDeployArgs({ WORKERS_CI_COMMIT_SHA: envSha }, () => gitSha),
      envSha,
    );
  });

  it("falls back to the checked-out commit when a deploy hook reports a branch name", () => {
    expectTag(
      wranglerDeployArgs({ WORKERS_CI_COMMIT_SHA: "main" }, () => gitSha),
      gitSha,
    );
  });

  it("falls back to the checked-out commit when no commit is reported", () => {
    expectTag(
      wranglerDeployArgs({}, () => gitSha),
      gitSha,
    );
  });

  it("passes neither flag when no full commit SHA can be resolved", () => {
    const args = wranglerDeployArgs(
      { WORKERS_CI_COMMIT_SHA: "main" },
      () => undefined,
    );
    expect(args).not.toContain("--tag");
    expect(args).not.toContain("--message");
  });
});
