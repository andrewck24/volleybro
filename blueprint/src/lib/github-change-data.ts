import { z } from "zod";
import {
  featureCapabilityLinks,
  type FeatureCapabilityLink,
} from "./feature-capabilities.ts";

const PR_URL =
  /^https:\/\/github\.com\/andrewck24\/volleybro\/pull\/([1-9]\d*)$/u;
const API_BASE = "https://api.github.com/repos/andrewck24/volleybro";

export type PullRequestSummary = {
  number: number;
  state: "open" | "closed";
  mergedAt: string | null;
  mergeCommitSha: string | null;
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  srcFiles: number | null;
};

export type ChangeStatus = "in-progress" | "merged";
export type ChangeMetrics = Pick<
  PullRequestSummary,
  "commits" | "filesChanged" | "additions" | "deletions" | "srcFiles"
>;

export type ChangeSummary = {
  slug: string;
  title: string;
  href: string;
  description?: string;
  status: ChangeStatus;
  publishedAt?: string;
  mergedAt?: string;
  metrics?: ChangeMetrics;
  scenarioCount: number;
  pullRequests?: Array<{ number: number; url: string }>;
  capabilities?: FeatureCapabilityLink[];
};

type GithubEnv = {
  BLUEPRINT_DB?: D1DatabaseLike;
  GITHUB_TOKEN?: string;
};

export type ChangeEntryForSummary = {
  id: string;
  data: {
    title?: string;
    description?: string;
    pull_requests?: Array<{ url?: string }>;
    capabilities?: string[];
    blocks?: unknown[];
    scenarioCount?: number;
    publishedAt?: Date | string | null;
  };
};

type D1StatementLike = {
  bind(...values: unknown[]): D1StatementLike;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseLike = { prepare(query: string): D1StatementLike };

type PullRequest = {
  number: number;
  state: "open" | "closed";
  merged_at: string | null;
  merge_commit_sha: string | null;
  commits: number;
  changed_files: number;
  additions: number;
  deletions: number;
};

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  state: z.enum(["open", "closed"]),
  merged_at: z.string().nullable(),
  merge_commit_sha: z.string().nullable(),
  commits: z.number().int().nonnegative(),
  changed_files: z.number().int().nonnegative(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});

const filesSchema = z.array(z.object({ filename: z.string() }));
const pullRequestSummarySchema = z.object({
  number: z.number().int().positive(),
  state: z.enum(["open", "closed"]),
  mergedAt: z.string().nullable(),
  mergeCommitSha: z.string().nullable(),
  commits: z.number().int().nonnegative(),
  filesChanged: z.number().int().nonnegative(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  srcFiles: z.number().int().nonnegative().nullable(),
});

export function parseAllowedPullRequestUrl(value: string): number | null {
  const match = PR_URL.exec(value);
  return match ? Number(match[1]) : null;
}

export function scenarioCount(blocks: unknown): number {
  const pending: unknown[] = [blocks];
  let count = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (!Array.isArray(current)) continue;
    for (const block of current) {
      if (!block || typeof block !== "object") continue;
      const record = block as Record<string, unknown>;
      if (record._type === "scenario") {
        count += 1;
      } else if (record._type === "scenario_cards") {
        try {
          const items = JSON.parse(String(record.items ?? "")) as unknown;
          if (Array.isArray(items)) count += items.length;
        } catch {}
      } else if (
        record._type === "disclosure" &&
        Array.isArray(record.blocks)
      ) {
        pending.push(record.blocks);
      }
    }
  }
  return count;
}

function cacheKeyForPr(number: number) {
  return `pr:${number}`;
}

function cacheKeyForMerge(sha: string) {
  return `merge:${sha}`;
}

type CacheRow = {
  cache_key: string;
  payload: string;
  expires_at: number | null;
};

async function readCacheRows(db: D1DatabaseLike, keys: string[], now: number) {
  const rows = new Map<string, PullRequestSummary>();
  for (let offset = 0; offset < keys.length; offset += 80) {
    const chunk = keys.slice(offset, offset + 80);
    const placeholders = chunk.map(() => "?").join(", ");
    const result = await db
      .prepare(
        `SELECT cache_key, payload, expires_at FROM blueprint_github_pull_request_cache WHERE cache_key IN (${placeholders})`,
      )
      .bind(...chunk)
      .all<CacheRow>();
    for (const row of result.results ?? []) {
      if (row.expires_at !== null && row.expires_at <= now) continue;
      try {
        rows.set(
          row.cache_key,
          pullRequestSummarySchema.parse(JSON.parse(row.payload)),
        );
      } catch {}
    }
  }
  return rows;
}

async function writeCacheRows(
  db: D1DatabaseLike,
  rows: Array<{
    key: string;
    value: PullRequestSummary;
    expiresAt: number | null;
  }>,
) {
  for (let offset = 0; offset < rows.length; offset += 30) {
    const chunk = rows.slice(offset, offset + 30);
    const valuesSql = chunk.map(() => "(?, ?, ?)").join(", ");
    const values = chunk.flatMap(({ key, value, expiresAt }) => [
      key,
      JSON.stringify(value),
      expiresAt,
    ]);
    await db
      .prepare(
        `INSERT INTO blueprint_github_pull_request_cache (cache_key, payload, expires_at) VALUES ${valuesSql} ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at`,
      )
      .bind(...values)
      .run();
  }
}

async function getJson<T>(
  url: string,
  env: GithubEnv,
  schema: z.ZodType<T>,
): Promise<T> {
  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "volleybro-blueprint",
  });
  if (env.GITHUB_TOKEN)
    headers.set("Authorization", `Bearer ${env.GITHUB_TOKEN}`);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return schema.parse(await response.json());
}

async function getPullRequest(
  env: GithubEnv,
  number: number,
): Promise<PullRequest> {
  return getJson(`${API_BASE}/pulls/${number}`, env, pullRequestSchema);
}

async function countSourceFiles(
  pr: PullRequest,
  env: GithubEnv,
): Promise<number | null> {
  let count = 0;
  let filesListed = 0;
  for (let page = 1; page <= 3; page += 1) {
    const files = await getJson(
      `${API_BASE}/pulls/${pr.number}/files?per_page=100&page=${page}`,
      env,
      filesSchema,
    );
    filesListed += files.length;
    count += files.filter(({ filename }) => filename.startsWith("src/")).length;
    if (files.length < 100)
      return filesListed === pr.changed_files ? count : null;
  }
  return filesListed === pr.changed_files ? count : null;
}

function fromApi(pr: PullRequest, srcFiles: number | null): PullRequestSummary {
  return {
    number: pr.number,
    state: pr.state,
    mergedAt: pr.merged_at,
    mergeCommitSha: pr.merge_commit_sha,
    commits: pr.commits,
    filesChanged: pr.changed_files,
    additions: pr.additions,
    deletions: pr.deletions,
    srcFiles,
  };
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

export async function readPullRequestSummaries(
  urls: string[],
  options: { env: GithubEnv; now?: number },
): Promise<PullRequestSummary[]> {
  const db = options.env.BLUEPRINT_DB;
  const now = options.now ?? Date.now();
  const ids = [
    ...new Set(
      urls
        .map(parseAllowedPullRequestUrl)
        .filter((id): id is number => id !== null),
    ),
  ];
  if (ids.length === 0) return [];

  const cached = new Map<number, PullRequestSummary>();
  if (db)
    try {
      const pointers = await readCacheRows(db, ids.map(cacheKeyForPr), now);
      const mergedPointers = [...pointers.entries()].flatMap(([key, value]) =>
        value.mergedAt && value.mergeCommitSha
          ? [
              {
                id: Number(key.slice(3)),
                mergeKey: cacheKeyForMerge(value.mergeCommitSha),
              },
            ]
          : [],
      );
      const mergedRows = await readCacheRows(
        db,
        mergedPointers.map(({ mergeKey }) => mergeKey),
        now,
      );
      for (const id of ids) {
        const pointer = pointers.get(cacheKeyForPr(id));
        if (!pointer) continue;
        if (pointer.mergedAt && pointer.mergeCommitSha) {
          const merged = mergedRows.get(
            cacheKeyForMerge(pointer.mergeCommitSha),
          );
          if (merged) cached.set(id, merged);
        } else {
          cached.set(id, pointer);
        }
      }
    } catch {}
  const missing = ids.filter((id) => !cached.has(id));
  if (missing.length === 0)
    return ids.map((id) => cached.get(id)!).filter(Boolean);

  const writes: Array<{
    key: string;
    value: PullRequestSummary;
    expiresAt: number | null;
  }> = [];
  const rows = await mapConcurrent(missing, 4, async (id) => {
    try {
      return await getPullRequest(options.env, id);
    } catch {
      return undefined;
    }
  });
  const metadata = new Map(
    rows
      .filter((row): row is PullRequest => !!row)
      .map((pr) => [pr.number, pr]),
  );

  const knownMissing = missing.flatMap((id) => {
    const pr = metadata.get(id);
    return pr ? [{ id, pr }] : [];
  });
  await mapConcurrent(knownMissing, 4, async ({ id, pr }) => {
    try {
      const srcFiles = await countSourceFiles(pr, options.env);
      const summary = fromApi(pr, srcFiles);
      cached.set(id, summary);
      if (summary.mergedAt && summary.mergeCommitSha) {
        writes.push(
          {
            key: cacheKeyForMerge(summary.mergeCommitSha),
            value: summary,
            expiresAt: null,
          },
          { key: cacheKeyForPr(id), value: summary, expiresAt: null },
        );
      } else {
        writes.push({
          key: cacheKeyForPr(id),
          value: summary,
          expiresAt: now + 5 * 60 * 1000,
        });
      }
    } catch {}
  });

  try {
    if (db) await writeCacheRows(db, writes);
  } catch {}

  return ids
    .map((id) => cached.get(id))
    .filter((value): value is PullRequestSummary => !!value);
}

export function summarizeChange(
  input: ChangeEntryForSummary,
  prs: PullRequestSummary[],
  featureTitles = new Map<string, string>(),
): ChangeSummary {
  const pullRequests = (input.data.pull_requests ?? []).flatMap((pr) => {
    const number = pr.url ? parseAllowedPullRequestUrl(pr.url) : null;
    return number === null || !pr.url ? [] : [{ number, url: pr.url }];
  });
  const requiredIds = [
    ...new Set(
      (input.data.pull_requests ?? [])
        .map((pr) => pr.url)
        .filter((url): url is string => !!url)
        .map(parseAllowedPullRequestUrl)
        .filter((id): id is number => id !== null),
    ),
  ];
  const byId = new Map(prs.map((pr) => [pr.number, pr]));
  const matches = requiredIds
    .map((id) => byId.get(id))
    .filter((pr): pr is PullRequestSummary => !!pr);
  const isAllMerged =
    requiredIds.length > 0 &&
    matches.length === requiredIds.length &&
    matches.every((pr) => !!pr.mergedAt && !!pr.mergeCommitSha);
  const metrics =
    matches.length === requiredIds.length && matches.length > 0
      ? matches.reduce<ChangeMetrics>(
          (sum, pr) => ({
            commits: sum.commits + pr.commits,
            filesChanged: sum.filesChanged + pr.filesChanged,
            additions: sum.additions + pr.additions,
            deletions: sum.deletions + pr.deletions,
            srcFiles:
              sum.srcFiles === null || pr.srcFiles === null
                ? null
                : sum.srcFiles + pr.srcFiles,
          }),
          {
            commits: 0,
            filesChanged: 0,
            additions: 0,
            deletions: 0,
            srcFiles: 0,
          },
        )
      : undefined;
  const mergedAt = isAllMerged
    ? matches
        .map((pr) => pr.mergedAt!)
        .sort()
        .at(-1)
    : undefined;
  const publishedAt =
    input.data.publishedAt instanceof Date
      ? input.data.publishedAt.toISOString()
      : (input.data.publishedAt ?? undefined);
  return {
    slug: input.id,
    title: input.data.title ?? input.id,
    href: `/changes/${input.id}`,
    description: input.data.description,
    status: isAllMerged ? "merged" : "in-progress",
    publishedAt: publishedAt ?? undefined,
    mergedAt,
    metrics,
    scenarioCount: input.data.scenarioCount ?? scenarioCount(input.data.blocks),
    pullRequests,
    capabilities: featureCapabilityLinks(
      input.data.capabilities ?? [],
      featureTitles,
    ),
  };
}

export function sortChanges(changes: ChangeSummary[]): ChangeSummary[] {
  return [...changes].sort((a, b) => {
    const aDate = a.mergedAt ?? a.publishedAt ?? "";
    const bDate = b.mergedAt ?? b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  });
}

export async function listPublishedChangeSummaries(
  entries: ChangeEntryForSummary[],
  featureTitles = new Map<string, string>(),
): Promise<ChangeSummary[]> {
  const runtime = await import("cloudflare:workers");
  const env = runtime.env as GithubEnv;
  const urls = entries.flatMap((entry) =>
    (entry.data.pull_requests ?? [])
      .map((pr) => pr.url)
      .filter((url): url is string => !!url),
  );
  const pullRequests = await readPullRequestSummaries(urls, { env });
  return sortChanges(
    entries.map((entry) => summarizeChange(entry, pullRequests, featureTitles)),
  );
}
