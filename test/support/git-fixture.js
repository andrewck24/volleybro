import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function commitFiles(cwd, files, message) {
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(cwd, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  await execFileAsync("git", ["add", "."], { cwd });
  await execFileAsync("git", ["commit", "--quiet", "-m", message], { cwd });
  return (
    await execFileAsync("git", ["rev-parse", "HEAD"], { cwd })
  ).stdout.trim();
}
