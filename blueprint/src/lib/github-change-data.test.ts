import {
  parseAllowedPullRequestUrl,
  readPullRequestSummaries,
  scenarioCount,
  sortChanges,
  summarizeChange,
  type PullRequestSummary,
} from "./github-change-data";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/support/msw/server";

class MemoryD1 {
  rows = new Map<string, { payload: string; expires_at: number | null }>();
  hasWriteFailure = false;
  hasReadFailure = false;

  prepare(query: string) {
    let values: unknown[] = [];
    return this.prepareBound(
      query,
      () => values,
      (next) => {
        values = next;
      },
    );
  }

  private prepareBound(
    query: string,
    values: () => unknown[],
    setValues: (next: unknown[]) => void,
  ) {
    return {
      bind: (...next: unknown[]) => {
        setValues(next);
        return this.prepareBound(query, values, setValues);
      },
      first: async <T>() => {
        if (this.hasReadFailure) throw new Error("D1 read unavailable");
        const [key] = values() as [string];
        return (this.rows.get(key) ?? null) as T | null;
      },
      all: async <T>() => {
        if (this.hasReadFailure) throw new Error("D1 read unavailable");
        return {
          results: (values() as string[]).flatMap((key) => {
            const row = this.rows.get(key);
            return row ? [{ cache_key: key, ...row }] : [];
          }) as T[],
        };
      },
      run: async () => {
        if (this.hasWriteFailure) throw new Error("D1 write unavailable");
        if (query.startsWith("INSERT")) {
          const bound = values();
          for (let index = 0; index < bound.length; index += 3) {
            const [key, payload, expires_at] = bound.slice(
              index,
              index + 3,
            ) as [string, string, number | null];
            this.rows.set(key, { payload, expires_at });
          }
        }
        return undefined;
      },
    };
  }
}

function response(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

const openPullRequest = {
  number: 552,
  state: "open",
  merged_at: null,
  merge_commit_sha: null,
  commits: 3,
  changed_files: 4,
  additions: 20,
  deletions: 5,
};

describe("GitHub derived Change status and metrics", () => {
  let originalFetch: PropertyDescriptor | undefined;

  beforeAll(() => {
    originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalFetch)
      Object.defineProperty(globalThis, "fetch", originalFetch);
    else Reflect.deleteProperty(globalThis, "fetch");
  });

  it("accepts only a canonical PR URL in the configured repository", () => {
    expect(
      parseAllowedPullRequestUrl(
        "https://github.com/andrewck24/volleybro/pull/552",
      ),
    ).toBe(552);
    expect(
      parseAllowedPullRequestUrl("https://github.com/another/repo/pull/552"),
    ).toBeNull();
    expect(
      parseAllowedPullRequestUrl(
        "https://github.com/andrewck24/volleybro/pull/552?tab=files",
      ),
    ).toBeNull();
    expect(
      parseAllowedPullRequestUrl(
        "https://github.com/andrewck24/volleybro/issues/552",
      ),
    ).toBeNull();
  });

  it("caches open PR results for five minutes and omits expired data after an API error", async () => {
    const db = new MemoryD1();
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/pulls/552")) return response(openPullRequest);
      if (url.includes("/pulls/552/files")) {
        return response([
          { filename: "src/example.ts" },
          { filename: "blueprint/src/example.tsx" },
          { filename: "docs/change.md" },
          { filename: "package.json" },
        ]);
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    const options = { env: { BLUEPRINT_DB: db }, now: 1_000 };
    const first = await readPullRequestSummaries(
      ["https://github.com/andrewck24/volleybro/pull/552"],
      options,
    );
    expect(first[0]).toMatchObject({
      filesChanged: 4,
      additions: 20,
      srcFiles: 1,
    });
    await readPullRequestSummaries(
      ["https://github.com/andrewck24/volleybro/pull/552"],
      { ...options, now: 2_000 },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockRejectedValue(new Error("rate limited"));
    const expired = await readPullRequestSummaries(
      ["https://github.com/andrewck24/volleybro/pull/552"],
      { ...options, now: 302_000 },
    );
    expect(expired).toEqual([]);
  });

  it("keeps merged metrics under a permanent merge-SHA cache key", async () => {
    const db = new MemoryD1();
    const merged = {
      ...openPullRequest,
      state: "closed",
      merged_at: "2026-10-12T08:00:00Z",
      merge_commit_sha: "a".repeat(40),
    };
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/pulls/552")) return response(merged);
      if (url.includes("/pulls/552/files"))
        return response([{ filename: "src/example.ts" }]);
      throw new Error(`Unexpected GitHub request: ${url}`);
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    const url = "https://github.com/andrewck24/volleybro/pull/552";
    const first = await readPullRequestSummaries([url], {
      env: { BLUEPRINT_DB: db },
      now: 1_000,
    });
    expect(first[0].mergedAt).toBe("2026-10-12T08:00:00Z");
    expect(db.rows.has(`merge:${"a".repeat(40)}`)).toBe(true);

    const second = await readPullRequestSummaries([url], {
      env: { BLUEPRINT_DB: db },
      now: 10_000_000_000,
    });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not fail public Change status when the cache database is unavailable", async () => {
    const db = new MemoryD1();
    db.hasReadFailure = true;
    server.use(
      http.get(
        "https://api.github.com/repos/andrewck24/volleybro/pulls/552",
        () => HttpResponse.error(),
      ),
    );
    await expect(
      readPullRequestSummaries(
        ["https://github.com/andrewck24/volleybro/pull/552"],
        { env: { BLUEPRINT_DB: db } },
      ),
    ).resolves.toEqual([]);
  });

  it("keeps verified pull requests when another pull request file listing fails", async () => {
    server.use(
      http.get(
        "https://api.github.com/repos/andrewck24/volleybro/pulls/552",
        () => HttpResponse.json({ ...openPullRequest, changed_files: 1 }),
      ),
      http.get(
        "https://api.github.com/repos/andrewck24/volleybro/pulls/553",
        () =>
          HttpResponse.json({
            ...openPullRequest,
            number: 553,
            changed_files: 1,
          }),
      ),
      http.get(
        "https://api.github.com/repos/andrewck24/volleybro/pulls/552/files*",
        () => HttpResponse.json([{ filename: "src/example.ts" }]),
      ),
      http.get(
        "https://api.github.com/repos/andrewck24/volleybro/pulls/553/files*",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    const summaries = await readPullRequestSummaries(
      [
        "https://github.com/andrewck24/volleybro/pull/552",
        "https://github.com/andrewck24/volleybro/pull/553",
      ],
      { env: {} },
    );

    expect(summaries).toEqual([
      expect.objectContaining({ number: 552, filesChanged: 1, srcFiles: 1 }),
    ]);
  });

  it("identifies itself with a User-Agent, which GitHub requires of every API request", async () => {
    server.use(
      http.get(
        "https://api.github.com/repos/andrewck24/volleybro/pulls/552*",
        ({ request }) =>
          request.headers.get("User-Agent") === "volleybro-blueprint"
            ? HttpResponse.json(
                request.url.includes("/files")
                  ? [{ filename: "src/example.ts" }]
                  : openPullRequest,
              )
            : new HttpResponse(null, { status: 403 }),
      ),
    );
    const summaries = await readPullRequestSummaries(
      ["https://github.com/andrewck24/volleybro/pull/552"],
      { env: { BLUEPRINT_DB: new MemoryD1() } },
    );
    expect(summaries).toEqual([expect.objectContaining({ number: 552 })]);
  });

  it("serves verified GitHub data even when writing the cache fails", async () => {
    const db = new MemoryD1();
    db.hasWriteFailure = true;
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/pulls/552")) return response(openPullRequest);
      if (url.includes("/pulls/552/files"))
        return response([{ filename: "src/example.ts" }]);
      throw new Error(`Unexpected GitHub request: ${url}`);
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    const result = await readPullRequestSummaries(
      ["https://github.com/andrewck24/volleybro/pull/552"],
      { env: { BLUEPRINT_DB: db }, now: 1_000 },
    );
    expect(result[0]).toMatchObject({ number: 552, filesChanged: 4 });
  });

  it("derives complete metrics for a cold index with five PRs", async () => {
    const prs = Array.from({ length: 5 }, (_, index) => ({
      ...openPullRequest,
      number: 552 + index,
      changed_files: index + 1,
      commits: index + 2,
      additions: (index + 1) * 10,
      deletions: index + 3,
    }));
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const detailMatch = url.match(/\/pulls\/(\d+)$/u);
      if (detailMatch) {
        const pr = prs.find(({ number }) => number === Number(detailMatch[1]));
        if (pr) return response(pr);
      }
      const match = url.match(/\/pulls\/(\d+)\/files/u);
      if (match) {
        const pr = prs.find(({ number }) => number === Number(match[1]));
        if (pr)
          return response(
            Array.from({ length: pr.changed_files }, (_, index) => ({
              filename:
                index === 0
                  ? `src/change-${match[1]}.ts`
                  : `docs/change-${match[1]}-${index}.md`,
            })),
          );
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const urls = prs.map(
      ({ number }) => `https://github.com/andrewck24/volleybro/pull/${number}`,
    );
    const result = await readPullRequestSummaries(urls, {
      env: {},
      now: 1_000,
    });

    expect(result).toHaveLength(5);
    expect(result).toEqual(
      prs.map((pr) => ({
        number: pr.number,
        state: pr.state,
        mergedAt: pr.merged_at,
        mergeCommitSha: pr.merge_commit_sha,
        commits: pr.commits,
        filesChanged: pr.changed_files,
        additions: pr.additions,
        deletions: pr.deletions,
        srcFiles: 1,
      })),
    );
    for (const { number } of prs) {
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.github.com/repos/andrewck24/volleybro/pulls/${number}`,
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.github.com/repos/andrewck24/volleybro/pulls/${number}/files?per_page=100&page=1`,
        expect.anything(),
      );
    }
  });

  it("does not report a partial src-file count when GitHub caps the PR file list", async () => {
    const largePullRequest = { ...openPullRequest, changed_files: 350 };
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/pulls/552"))
        return response(largePullRequest);
      if (url.pathname.endsWith("/pulls/552/files")) {
        const page = Number(url.searchParams.get("page"));
        return response(
          page <= 3
            ? Array.from({ length: 100 }, (_, index) => ({
                filename: `src/${page}-${index}.ts`,
              }))
            : [],
        );
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const result = await readPullRequestSummaries(
      ["https://github.com/andrewck24/volleybro/pull/552"],
      { env: {}, now: 1_000 },
    );

    expect(result[0]).toMatchObject({ filesChanged: 350, srcFiles: null });
  });

  it("requires every shard PR to be merged and sorts by final merge time", () => {
    const merged: PullRequestSummary = {
      number: 552,
      state: "closed",
      mergedAt: "2026-10-12T08:00:00Z",
      mergeCommitSha: "a".repeat(40),
      commits: 3,
      filesChanged: 4,
      additions: 20,
      deletions: 5,
      srcFiles: 1,
    };
    const open: PullRequestSummary = {
      ...merged,
      number: 553,
      state: "open",
      mergedAt: null,
      mergeCommitSha: null,
    };
    const change = {
      id: "multi-shard",
      data: {
        title: "Multi shard",
        pull_requests: [
          { url: "https://github.com/andrewck24/volleybro/pull/552" },
          { url: "https://github.com/andrewck24/volleybro/pull/553" },
        ],
        blocks: [
          { _type: "scenario", _version: 1 },
          { _type: "scenario_cards", items: '[{"id":"S2"}]' },
        ],
        publishedAt: "2026-10-01T00:00:00Z",
      },
    };
    const partial = summarizeChange(change, [merged, open]);
    expect(partial).toMatchObject({
      status: "in-progress",
      metrics: { commits: 6, filesChanged: 8 },
      scenarioCount: 2,
    });

    const complete = summarizeChange(change, [
      merged,
      {
        ...open,
        state: "closed",
        mergedAt: "2026-10-13T08:00:00Z",
        mergeCommitSha: "b".repeat(40),
      },
    ]);
    expect(complete.status).toBe("merged");
    expect(complete.mergedAt).toBe("2026-10-13T08:00:00Z");
    expect(complete.metrics).toMatchObject({ commits: 6, filesChanged: 8 });
    expect(
      sortChanges([
        { ...partial, slug: "old" },
        { ...complete, slug: "new" },
      ]).map((item) => item.slug),
    ).toEqual(["new", "old"]);
  });

  it("keeps a newly published Change with no PR in progress and without metrics", () => {
    const summary = summarizeChange(
      {
        id: "new-change",
        data: {
          title: "New Change",
          pull_requests: [],
          publishedAt: "2026-10-12T08:00:00Z",
          blocks: [
            { _type: "scenario", _version: 1 },
            {
              _type: "disclosure",
              _version: 1,
              summary: "Details",
              blocks: [
                { _type: "scenario", _version: 1 },
                {
                  _type: "scenario_cards",
                  _version: 1,
                  items: '[{"id":"nested-1"},{"id":"nested-2"}]',
                },
              ],
            },
          ],
        },
      },
      [],
    );

    expect(summary).toMatchObject({
      slug: "new-change",
      status: "in-progress",
      publishedAt: "2026-10-12T08:00:00Z",
      scenarioCount: 4,
    });
    expect(summary.metrics).toBeUndefined();
  });

  it("sorts unmerged Changes by their EmDash publication date", () => {
    const older = summarizeChange(
      {
        id: "older",
        data: { title: "Older", publishedAt: "2026-10-10T08:00:00Z" },
      },
      [],
    );
    const newer = summarizeChange(
      {
        id: "newer",
        data: { title: "Newer", publishedAt: "2026-10-12T08:00:00Z" },
      },
      [],
    );

    expect(sortChanges([older, newer]).map((item) => item.slug)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("counts scenarios in disclosure trees without scanning unrelated block data", () => {
    expect(
      scenarioCount([
        { _type: "scenario" },
        { _type: "scenario_cards", items: '[{"id":"S1"},{"id":"S2"}]' },
        {
          _type: "disclosure",
          blocks: [
            { _type: "scenario" },
            { _type: "scenario_cards", items: '[{"id":"S3"}]' },
            { _type: "code", code: '{"_type":"scenario"}' },
            {
              _type: "variant_gallery",
              frames: [{ blocks: [{ _type: "scenario" }] }],
            },
            {
              _type: "disclosure",
              blocks: [{ _type: "scenario" }],
            },
          ],
        },
        { _type: "scenario_cards", items: "not-json" },
      ]),
    ).toBe(6);
  });
});
