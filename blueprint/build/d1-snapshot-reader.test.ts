import { http, HttpResponse } from "msw";
import { server } from "../../test/support/msw/server";
import { createD1SnapshotReader } from "./d1-snapshot-reader.mjs";

const endpoint =
  "https://api.cloudflare.com/client/v4/accounts/account-1/d1/database/database-1/query";
const credentials = {
  accountId: "account-1",
  databaseId: "database-1",
  token: "test-token",
};

describe("D1 snapshot reader budget", () => {
  it("accepts a valid zero-row read", async () => {
    server.use(
      http.post(endpoint, () =>
        HttpResponse.json({
          success: true,
          result: [{ success: true, results: [], meta: { rows_read: 0 } }],
        }),
      ),
    );
    const reader = createD1SnapshotReader(credentials);

    await expect(reader.query("SELECT 1", [])).resolves.toEqual([]);
    expect(reader.rowsRead).toBe(0);
  });

  it("accumulates reads, accepts the exact limit, then refuses another request", async () => {
    let requests = 0;
    server.use(
      http.post(endpoint, () => {
        requests += 1;
        return HttpResponse.json({
          success: true,
          result: [{ success: true, results: [], meta: { rows_read: 5_000 } }],
        });
      }),
    );
    const reader = createD1SnapshotReader(credentials);

    await reader.query("SELECT 1", []);
    await reader.query("SELECT 2", []);
    expect(reader.rowsRead).toBe(10_000);
    await expect(reader.query("SELECT 3", [])).rejects.toThrow();
    expect(requests).toBe(2);
  });

  it("rejects a cumulative read that crosses the limit", async () => {
    let requests = 0;
    server.use(
      http.post(endpoint, () => {
        requests += 1;
        const rowsRead = requests === 1 ? 8_000 : 3_000;
        return HttpResponse.json({
          success: true,
          result: [
            { success: true, results: [], meta: { rows_read: rowsRead } },
          ],
        });
      }),
    );
    const reader = createD1SnapshotReader(credentials);

    await reader.query("SELECT 1", []);
    await expect(reader.query("SELECT 2", [])).rejects.toThrow();
    expect(reader.rowsRead).toBe(11_000);
    await expect(reader.query("SELECT 3", [])).rejects.toThrow();
    expect(requests).toBe(2);
  });

  it.each([
    ["missing metadata", {}],
    ["string count", { rows_read: "2" }],
    ["negative count", { rows_read: -1 }],
    ["fractional count", { rows_read: 1.5 }],
    ["unsafe count", { rows_read: Number.MAX_SAFE_INTEGER + 1 }],
    ["non-finite count", { rows_read: null }],
  ])("rejects %s and blocks later requests", async (_label, meta) => {
    let requests = 0;
    server.use(
      http.post(endpoint, () => {
        requests += 1;
        return HttpResponse.json({
          success: true,
          result: [{ success: true, results: [], meta }],
        });
      }),
    );
    const reader = createD1SnapshotReader(credentials);

    await expect(reader.query("SELECT 1", [])).rejects.toThrow();
    await expect(reader.query("SELECT 2", [])).rejects.toThrow();
    expect(requests).toBe(1);
  });

  it("rejects an over-budget response and sends no later request", async () => {
    let requests = 0;
    server.use(
      http.post(endpoint, () => {
        requests += 1;
        return HttpResponse.json({
          success: true,
          result: [{ success: true, results: [], meta: { rows_read: 10_001 } }],
        });
      }),
    );
    const reader = createD1SnapshotReader(credentials);

    await expect(reader.query("SELECT 1", [])).rejects.toThrow();
    await expect(reader.query("SELECT 2", [])).rejects.toThrow();
    expect(requests).toBe(1);
  });

  it("fails closed after an HTTP error without exposing credentials", async () => {
    let requests = 0;
    server.use(
      http.post(endpoint, () => {
        requests += 1;
        return HttpResponse.json({ success: false }, { status: 503 });
      }),
    );
    const reader = createD1SnapshotReader(credentials);

    let message = "";
    try {
      await reader.query("SELECT 1", []);
    } catch (error) {
      message = String(error);
    }
    expect(message).not.toContain(credentials.token);
    await expect(reader.query("SELECT 2", [])).rejects.toThrow();
    expect(requests).toBe(1);
  });

  it.each(["SELECT 1; DELETE FROM changes", "SELECT 1; SELECT 2", "SELECT 1;"])(
    "refuses multi-statement SQL before making a request: %s",
    async (sql) => {
      let requests = 0;
      server.use(
        http.post(endpoint, () => {
          requests += 1;
          return HttpResponse.json({});
        }),
      );
      const reader = createD1SnapshotReader(credentials);

      await expect(reader.query(sql, [])).rejects.toThrow();
      expect(requests).toBe(0);
    },
  );
});
