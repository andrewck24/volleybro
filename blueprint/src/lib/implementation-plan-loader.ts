import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveImplementationPlan } from "@/lib/implementation-plan";
import { CHANGES_ROOT, loadChangeMetadata } from "@/lib/change-catalog";

export async function loadImplementationPlan(
  changeDirectory: string,
  contentRoot = CHANGES_ROOT,
) {
  const implementationDirectory = path.join(
    contentRoot,
    changeDirectory,
    "implementation",
  );
  const sliceDirectory = path.join(implementationDirectory, "slices");
  const [change, planSource, filenames] = await Promise.all([
    loadChangeMetadata(changeDirectory, contentRoot),
    readFile(path.join(implementationDirectory, "plan.json"), "utf8"),
    readdir(sliceDirectory),
  ]);
  const jsonFiles = filenames.filter((filename) => filename.endsWith(".json"));
  const entries = await Promise.all(
    jsonFiles.map(async (filename) => ({
      source: `implementation/slices/${filename}`,
      value: JSON.parse(
        await readFile(path.join(sliceDirectory, filename), "utf8"),
      ),
    })),
  );

  return resolveImplementationPlan(
    JSON.parse(planSource),
    entries,
    change.slug,
  );
}
