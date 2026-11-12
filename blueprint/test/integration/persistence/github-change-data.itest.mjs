import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { readPullRequestSummaries } from "../../../src/lib/github-change-data.ts";

const migration = await readFile(
  new URL(
    "../../../.emdash/migrations/0001_github_pull_request_cache.sql",
    import.meta.url,
  ),
  "utf8",
);

class SQLiteD1 {
  database = new DatabaseSync(":memory:");

  constructor() {
    this.database.exec(migration);
  }

  prepare(sql) {
    const statement = this.database.prepare(sql);
    let values = [];
    const boundStatement = {
      bind: (...nextValues) => {
        values = nextValues;
        return boundStatement;
      },
      first: async (column) => {
        const row = statement.get(...values) ?? null;
        return column && row ? (row[column] ?? null) : row;
      },
      all: async () => ({ results: statement.all(...values) }),
      run: async () => statement.run(...values),
    };
    return boundStatement;
  }

  close() {
    this.database.close();
  }
}

function stubGitHubFetch(t, { isMerged = false } = {}) {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (input) => {
    requests += 1;
    const url = new URL(String(input));
    if (url.pathname.endsWith("/pulls/552")) {
      return Response.json({
        number: 552,
        state: isMerged ? "closed" : "open",
        merged_at: isMerged ? "2026-10-12T08:00:00Z" : null,
        merge_commit_sha: isMerged ? "a".repeat(40) : null,
        commits: 3,
        changed_files: 1,
        additions: 20,
        deletions: 5,
      });
    }
    if (url.pathname.endsWith("/pulls/552/files")) {
      return Response.json([{ filename: "src/example.ts" }]);
    }
    throw new Error(`Unexpected GitHub API request: ${url}`);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  return () => requests;
}

const pullRequestUrl = "https://github.com/andrewck24/volleybro/pull/552";

test("D1 SQL persists open-cache expiry and refreshes expired rows", async (t) => {
  const database = new SQLiteD1();
  t.after(() => database.close());
  const requestCount = stubGitHubFetch(t);
  const options = { env: { BLUEPRINT_DB: database }, now: 1_000 };

  const first = await readPullRequestSummaries([pullRequestUrl], options);
  assert.equal(first[0]?.filesChanged, 1);
  assert.equal(requestCount(), 2);

  const cachedRow = database.database
    .prepare(
      "SELECT payload, expires_at FROM blueprint_github_pull_request_cache WHERE cache_key = ?",
    )
    .get("pr:552");
  assert.equal(cachedRow.expires_at, 301_000);
  assert.equal(JSON.parse(cachedRow.payload).number, 552);

  await readPullRequestSummaries([pullRequestUrl], {
    env: { BLUEPRINT_DB: database },
    now: 300_999,
  });
  assert.equal(requestCount(), 2);

  await readPullRequestSummaries([pullRequestUrl], {
    env: { BLUEPRINT_DB: database },
    now: 301_000,
  });
  assert.equal(requestCount(), 4);
  assert.equal(
    database.database
      .prepare(
        "SELECT expires_at FROM blueprint_github_pull_request_cache WHERE cache_key = ?",
      )
      .get("pr:552").expires_at,
    601_000,
  );
});

test("D1 SQL retains merged metrics permanently under the merge SHA", async (t) => {
  const database = new SQLiteD1();
  t.after(() => database.close());
  const requestCount = stubGitHubFetch(t, { isMerged: true });
  const first = await readPullRequestSummaries([pullRequestUrl], {
    env: { BLUEPRINT_DB: database },
    now: 1_000,
  });
  assert.equal(first[0]?.mergedAt, "2026-10-12T08:00:00Z");
  assert.equal(requestCount(), 2);

  const shaKey = `merge:${"a".repeat(40)}`;
  const mergedRow = database.database
    .prepare(
      "SELECT payload, expires_at FROM blueprint_github_pull_request_cache WHERE cache_key = ?",
    )
    .get(shaKey);
  assert.equal(mergedRow.expires_at, null);
  assert.equal(JSON.parse(mergedRow.payload).mergeCommitSha, "a".repeat(40));

  const cached = await readPullRequestSummaries([pullRequestUrl], {
    env: { BLUEPRINT_DB: database },
    now: Number.MAX_SAFE_INTEGER,
  });
  assert.deepEqual(cached, first);
  assert.equal(requestCount(), 2);
});

test("refreshes malformed cached pull request summaries from GitHub", async (t) => {
  const database = new SQLiteD1();
  t.after(() => database.close());
  database.database
    .prepare(
      "INSERT INTO blueprint_github_pull_request_cache (cache_key, payload, expires_at) VALUES (?, ?, ?)",
    )
    .run("pr:552", JSON.stringify({ number: "552" }), null);
  database.database
    .prepare(
      "INSERT INTO blueprint_github_pull_request_cache (cache_key, payload, expires_at) VALUES (?, ?, ?)",
    )
    .run(
      "pr:553",
      JSON.stringify({
        number: 553,
        state: "open",
        mergedAt: null,
        mergeCommitSha: null,
        commits: 2,
        filesChanged: 4,
        additions: 8,
        deletions: 1,
        srcFiles: 2,
      }),
      null,
    );
  const github = setupServer(
    http.get(
      "https://api.github.com/repos/andrewck24/volleybro/pulls/552",
      () =>
        HttpResponse.json({
          number: 552,
          state: "open",
          merged_at: null,
          merge_commit_sha: null,
          commits: 3,
          changed_files: 1,
          additions: 20,
          deletions: 5,
        }),
    ),
    http.get(
      "https://api.github.com/repos/andrewck24/volleybro/pulls/553",
      () => new HttpResponse(null, { status: 502 }),
    ),
    http.get(
      "https://api.github.com/repos/andrewck24/volleybro/pulls/552/files*",
      () => HttpResponse.json([{ filename: "src/example.ts" }]),
    ),
  );
  github.listen({ onUnhandledRequest: "error" });
  t.after(() => github.close());

  const summaries = await readPullRequestSummaries(
    [pullRequestUrl, pullRequestUrl.replace("/552", "/553")],
    { env: { BLUEPRINT_DB: database }, now: 1_000 },
  );
  const cached = database.database
    .prepare(
      "SELECT payload FROM blueprint_github_pull_request_cache WHERE cache_key = ?",
    )
    .get("pr:552");

  assert.equal(summaries[0]?.number, 552);
  assert.equal(summaries[0]?.srcFiles, 1);
  assert.ok(
    summaries.some(
      ({ number, filesChanged, srcFiles }) =>
        number === 553 && filesChanged === 4 && srcFiles === 2,
    ),
  );
  assert.equal(JSON.parse(cached.payload).number, 552);
  assert.equal(JSON.parse(cached.payload).srcFiles, 1);
});

test("returns verified GitHub summaries when reading the cache fails", async (t) => {
  const database = new SQLiteD1();
  t.after(() => database.close());
  database.database.exec("DROP TABLE blueprint_github_pull_request_cache");
  const github = setupServer(
    http.get(
      "https://api.github.com/repos/andrewck24/volleybro/pulls/552",
      () =>
        HttpResponse.json({
          number: 552,
          state: "open",
          merged_at: null,
          merge_commit_sha: null,
          commits: 3,
          changed_files: 1,
          additions: 20,
          deletions: 5,
        }),
    ),
    http.get(
      "https://api.github.com/repos/andrewck24/volleybro/pulls/552/files*",
      () => HttpResponse.json([{ filename: "src/example.ts" }]),
    ),
  );
  github.listen({ onUnhandledRequest: "error" });
  t.after(() => github.close());

  const summaries = await readPullRequestSummaries([pullRequestUrl], {
    env: { BLUEPRINT_DB: database },
    now: 1_000,
  });

  assert.equal(summaries[0]?.number, 552);
  assert.equal(summaries[0]?.srcFiles, 1);
});

test("serves verified GitHub data even when writing the cache fails", async (t) => {
  const database = new SQLiteD1();
  t.after(() => database.close());
  database.database.exec(`
    CREATE TRIGGER reject_cache_write
    BEFORE INSERT ON blueprint_github_pull_request_cache
    BEGIN
      SELECT RAISE(ABORT, 'cache writes unavailable');
    END;
  `);
  const github = setupServer(
    http.get(
      "https://api.github.com/repos/andrewck24/volleybro/pulls/552",
      () =>
        HttpResponse.json({
          number: 552,
          state: "open",
          merged_at: null,
          merge_commit_sha: null,
          commits: 3,
          changed_files: 1,
          additions: 20,
          deletions: 5,
        }),
    ),
    http.get(
      "https://api.github.com/repos/andrewck24/volleybro/pulls/552/files*",
      () => HttpResponse.json([{ filename: "src/example.ts" }]),
    ),
  );
  github.listen({ onUnhandledRequest: "error" });
  t.after(() => github.close());

  const summaries = await readPullRequestSummaries([pullRequestUrl], {
    env: { BLUEPRINT_DB: database },
    now: 1_000,
  });
  const cachedCount = database.database
    .prepare(
      "SELECT COUNT(*) AS count FROM blueprint_github_pull_request_cache",
    )
    .get().count;

  assert.equal(summaries[0]?.number, 552);
  assert.equal(summaries[0]?.srcFiles, 1);
  assert.equal(cachedCount, 0);
});
