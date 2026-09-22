/**
 * Move decision records out from under Feature and Change directories into one
 * flat, repository-wide store, and convert them to schema version 2.
 *
 * The Feature tree holds one file per record per capability the record names,
 * so 65 files hold 45 records. Every copy of a record is byte-identical apart
 * from its `$schema` relative path, and every record's directory placement is
 * exactly the set of IDs in its own `targets` array — the tree restates a field
 * the file already carries. This drops the copies, renames that field to
 * `capabilities`, removes `originDecision`, and renumbers the active Change's
 * own records into the one surviving sequence.
 *
 * It refuses rather than guesses: a record whose copies disagree, a number used
 * twice, or a count that does not come out at 45 stops the run before anything
 * is written.
 *
 * Writes plain two-space JSON, so follow it with
 * `pnpm exec prettier --write "blueprint/content/decisions/*.json"`.
 *
 * Usage: `node --experimental-strip-types scripts/migrations/flat-decision-records.ts`
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const CONTENT = path.join(ROOT, "blueprint", "content");
const FEATURES = path.join(CONTENT, "features");
const CHANGE_DECISIONS = path.join(
  CONTENT,
  "changes",
  "standalone-decision-records",
  "proposal",
  "decisions",
);
const FLAT = path.join(CONTENT, "decisions");
const EXPECTED_FILES = 65;
const EXPECTED_RECORDS = 45;

type Record_ = Record<string, unknown>;

function findDecisionDirs(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    if (entry.name === "decisions") found.push(child);
    else found.push(...findDecisionDirs(child));
  }
  return found;
}

function body(record: Record_) {
  const { $schema: _schema, ...rest } = record;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

function toVersion2(record: Record_): Record_ {
  const {
    $schema: _schema,
    schemaVersion: _version,
    targets,
    originDecision: _origin,
    id,
    title,
    decision,
    ...rest
  } = record;
  return {
    $schema: "../../schemas/decision-record.schema.json",
    schemaVersion: 2,
    id,
    title,
    capabilities: targets,
    decision,
    ...rest,
  };
}

function collect(dirs: string[]) {
  const records = new Map<string, { name: string; record: Record_ }>();
  let files = 0;
  for (const dir of dirs) {
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      files += 1;
      const record = JSON.parse(
        readFileSync(path.join(dir, name), "utf8"),
      ) as Record_;
      const seen = records.get(name);
      if (seen && body(seen.record) !== body(record)) {
        throw new Error(`${name}: copies disagree; merge them by hand first`);
      }
      records.set(name, { name, record });
    }
  }
  return { files, records: [...records.values()] };
}

const feature = collect(findDecisionDirs(FEATURES));
if (feature.files !== EXPECTED_FILES) {
  throw new Error(`expected ${EXPECTED_FILES} files, found ${feature.files}`);
}
if (feature.records.length !== EXPECTED_RECORDS) {
  throw new Error(
    `expected ${EXPECTED_RECORDS} records, found ${feature.records.length}`,
  );
}

const numberOf = (name: string) => Number(name.match(/^D(\d+)-/)![1]);
let next = Math.max(...feature.records.map((r) => numberOf(r.name))) + 1;

// The Change's own records were written under the model this Change replaces,
// numbered within their Proposal page. They join the one sequence here, which
// is the only renumbering that ever happens to a record.
const change = collect([CHANGE_DECISIONS]);
const renumbered = change.records
  .sort((a, b) => numberOf(a.name) - numberOf(b.name))
  .map(({ name, record }) => {
    const id = `D${next++}`;
    return {
      name: name.replace(/^D\d+-/, `${id}-`),
      record: { ...record, id },
      from: record.id as string,
    };
  });

mkdirSync(FLAT, { recursive: true });
const written = new Set<number>();
for (const { name, record } of [...feature.records, ...renumbered]) {
  const number = numberOf(name);
  if (written.has(number)) throw new Error(`D${number} used twice`);
  written.add(number);
  writeFileSync(
    path.join(FLAT, name),
    `${JSON.stringify(toVersion2(record), null, 2)}\n`,
  );
}

for (const dir of findDecisionDirs(FEATURES)) rmSync(dir, { recursive: true });
rmSync(CHANGE_DECISIONS, { recursive: true });

console.log(
  `${feature.files} files -> ${written.size} records in ${path.relative(ROOT, FLAT)}`,
);
for (const { from, name } of renumbered) {
  console.log(`  ${from} -> ${name.split("-")[0]}  ${name}`);
}
