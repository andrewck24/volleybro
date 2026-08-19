import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveImplementationPlan } from "@/lib/implementation-plan";
import { parseChangeMetadata } from "@/lib/change-metadata";

const DIRECTORY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUS = {
  "in-progress": "in-progress",
  archive: "archived",
} as const;

export async function loadImplementationPlan(
  directory: keyof typeof STATUS,
  changeDirectory: string,
  contentRoot = path.join(process.cwd(), "content", "changes"),
) {
  if (!STATUS[directory] || !DIRECTORY_PATTERN.test(changeDirectory)) {
    throw new Error(
      `Unsupported Change location: ${directory}/${changeDirectory}`,
    );
  }

  const implementationDirectory = path.join(
    contentRoot,
    directory,
    changeDirectory,
    "implementation",
  );
  const sliceDirectory = path.join(implementationDirectory, "slices");
  const [metadataSource, planSource, filenames] = await Promise.all([
    readFile(
      path.join(contentRoot, directory, changeDirectory, "change.json"),
      "utf8",
    ),
    readFile(path.join(implementationDirectory, "plan.json"), "utf8"),
    readdir(sliceDirectory),
  ]);
  const change = parseChangeMetadata(
    JSON.parse(metadataSource),
    changeDirectory,
    directory,
  );
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
