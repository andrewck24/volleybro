import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { rmSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [command, ...args] = process.argv.slice(2);
const run = (cmd, argv) => execFileSync(cmd, argv, { encoding: "utf8" }).trim();

if (command === "diff") {
  const [base, head, ...paths] = args;
  const diff = run("git", [
    "diff",
    "--numstat",
    `${base}...${head}`,
    "--",
    ...paths,
  ]);
  const names = run("git", [
    "diff",
    "--name-only",
    `${base}...${head}`,
    "--",
    ...paths,
  ])
    .split("\n")
    .filter(Boolean);
  const rows = names.map((file) => {
    const [added, removed] = (
      diff.split("\n").find((line) => line.endsWith(`\t${file}`)) ?? "0\t0"
    ).split("\t");
    const patch = run("git", [
      "diff",
      "--unified=0",
      `${base}...${head}`,
      "--",
      file,
    ]);
    return {
      file,
      test: /(?:\.test\.|__tests__)/.test(file),
      added: Number(added),
      removed: Number(removed),
      hunks: (patch.match(/^@@/gm) ?? []).length,
    };
  });
  const summarize = (items) => ({
    files: items.length,
    placesChanged: items.reduce((n, row) => n + row.hunks, 0),
    added: items.reduce((n, row) => n + row.added, 0),
    removed: items.reduce((n, row) => n + row.removed, 0),
  });
  console.log(
    JSON.stringify(
      {
        files: names,
        total: summarize(rows),
        tests: summarize(rows.filter((row) => row.test)),
        nonTests: summarize(rows.filter((row) => !row.test)),
      },
      null,
      2,
    ),
  );
} else if (command === "bundle") {
  let esbuild;
  try {
    esbuild = await import("esbuild");
  } catch {
    console.error("esbuild is not installed");
    process.exit(1);
  }
  const entries = ["async", "effect", "rtk-listener"]
    .map((id) => resolve(`src/prototypes/ate-393/pending-${id}.ts`))
    .filter((entry) => {
      try {
        return statSync(entry).isFile();
      } catch {
        return false;
      }
    });
  const baseline = {};
  const results = [];
  for (const entry of entries) {
    const id = entry.match(/pending-(.*)\.ts$/)[1];
    const output = (
      await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        minify: true,
        platform: "browser",
        format: "esm",
        treeShaking: true,
      })
    ).outputFiles[0].contents;
    const raw = output.byteLength;
    const gzip = gzipSync(output).byteLength;
    if (id === "async") baseline.value = { raw, gzip };
    results.push({
      variant: id,
      raw,
      gzip,
      deltaRaw: id === "async" ? 0 : raw - (baseline.value?.raw ?? 0),
      deltaGzip: id === "async" ? 0 : gzip - (baseline.value?.gzip ?? 0),
    });
  }
  console.log(JSON.stringify(results, null, 2));
} else if (command === "bench") {
  const esbuild = await import("esbuild");
  const outputPath = resolve("scripts/ate-393/.bench-tmp.mjs");
  const built = await esbuild.build({
    entryPoints: ["src/prototypes/ate-393/team-variants.ts"],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
  });
  await writeFile(outputPath, built.outputFiles[0].contents);
  const { createTeamVariants, updateTeamVariants } = await import(
    `${pathToFileURL(outputPath).href}?run=${Date.now()}`
  );
  rmSync(outputPath, { force: true });
  const measure = async (fn) => {
    const samples = [];
    const execute = async () => undefined;
    for (let i = 0; i < 200; i++) await fn(execute);
    for (let i = 0; i < 2000; i++) {
      const start = performance.now();
      await fn(execute);
      samples.push((performance.now() - start) * 1000);
    }
    samples.sort((a, b) => a - b);
    return { p50Us: samples[1000], p95Us: samples[1900] };
  };
  const results = {};
  for (const id of Object.keys(createTeamVariants)) {
    results[id] = {
      createTeam: await measure((execute) =>
        createTeamVariants[id]({ name: "Team", nickname: "T" }, execute),
      ),
      updateTeam: await measure((execute) =>
        updateTeamVariants[id]({ name: "Team" }, execute),
      ),
    };
  }
  console.log(JSON.stringify(results, null, 2));
} else {
  console.error(
    "usage: measure.mjs diff <baseRef> <headRef> [pathspec...] | bundle | bench",
  );
  process.exit(2);
}
