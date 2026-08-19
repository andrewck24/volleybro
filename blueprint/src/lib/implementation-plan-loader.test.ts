import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

jest.mock("server-only", () => ({}), { virtual: true });

import { loadImplementationPlan } from "./implementation-plan-loader";

describe("loadImplementationPlan", () => {
  it("loads a plan from the Change directory named by its slug", async () => {
    const contentRoot = await mkdtemp(path.join(tmpdir(), "blueprint-plan-"));
    const changeDirectory = "sample-change";
    const root = path.join(contentRoot, changeDirectory);
    await mkdir(path.join(root, "implementation", "slices"), {
      recursive: true,
    });
    await writeFile(
      path.join(root, "change.json"),
      JSON.stringify({
        schemaVersion: 1,
        slug: "sample-change",
        title: "Sample Change",
        lifecycle: "archived",
        startedAt: "2026-08-01",
        archivedAt: "2026-08-04",
        summary: "An archived test Change.",
        capabilities: ["platform/delivery-workflow"],
        tags: ["workflow"],
      }),
    );
    await writeFile(
      path.join(root, "implementation", "plan.json"),
      JSON.stringify({
        schemaVersion: 1,
        change: "sample-change",
        slices: ["S01"],
      }),
    );
    await writeFile(
      path.join(root, "implementation", "slices", "S01-sample.json"),
      JSON.stringify({
        id: "S01",
        title: "Deliver the sample",
        capabilities: ["platform/delivery-workflow"],
        dependsOn: [],
        outcome: "The archived plan still renders.",
        acceptanceCriteria: ["Archive retains the slice."],
        verification: ["Build Blueprint."],
        status: "completed",
      }),
    );

    await expect(
      loadImplementationPlan(changeDirectory, contentRoot),
    ).resolves.toMatchObject([{ id: "S01" }]);
  });
});
