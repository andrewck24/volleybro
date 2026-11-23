import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GIT_OUTPUT_LIMIT = 64 * 1024 * 1024;

export async function git(root, args) {
  return (
    await execFileAsync("git", args, {
      cwd: root,
      maxBuffer: GIT_OUTPUT_LIMIT,
    })
  ).stdout.trim();
}

async function orNull(read) {
  try {
    return await read();
  } catch {
    return null;
  }
}

export async function resolveScopeBase(root) {
  const remoteDefault = await orNull(() =>
    git(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]),
  );
  for (const ref of [remoteDefault, "origin/main", "main"].filter(Boolean)) {
    if (await orNull(() => git(root, ["rev-parse", "--verify", ref]))) {
      return ref;
    }
  }
  return "main";
}
