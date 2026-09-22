jest.mock("server-only", () => ({}), { virtual: true });

let mockFiles: Record<string, unknown> = {};
jest.mock("node:fs", () => {
  const actual = jest.requireActual("node:fs");
  return {
    ...actual,
    readdirSync: (_dir: string) => Object.keys(mockFiles),
    readFileSync: (target: string) => {
      const name = target.split("/").pop() as string;
      return JSON.stringify(mockFiles[name]);
    },
  };
});

function record(id: string, capabilities: string[]) {
  return {
    schemaVersion: 2,
    id,
    title: `Title ${id}`,
    capabilities,
    decision: `Decision ${id}`,
  };
}

// The index reads its directory once at module scope, so each case needs a
// fresh module instance to pick up that case's mockFiles.
function decisionsFor(capability: string): Array<{ id: string }> {
  jest.resetModules();
  return jest.requireActual("./decisions-index").decisionsFor(capability);
}

describe("decisionsFor", () => {
  beforeEach(() => {
    mockFiles = {};
  });

  it("matches a capability exactly, not its parent or its child", () => {
    mockFiles = {
      "0001-parent.json": record("0001", ["team-management/roles"]),
      "0002-child.json": record("0002", ["team-management/roles/detail"]),
    };

    expect(decisionsFor("team-management/roles").map((r) => r.id)).toEqual([
      "0001",
    ]);
    expect(
      decisionsFor("team-management/roles/detail").map((r) => r.id),
    ).toEqual(["0002"]);
  });

  it("lists a record naming two capabilities under both", () => {
    mockFiles = {
      "0001-shared.json": record("0001", [
        "team-management/roles",
        "game-recording/statistics",
      ]),
    };

    expect(decisionsFor("team-management/roles").map((r) => r.id)).toEqual([
      "0001",
    ]);
    expect(decisionsFor("game-recording/statistics").map((r) => r.id)).toEqual([
      "0001",
    ]);
  });

  it("sorts matches by decision number ascending", () => {
    mockFiles = {
      "0010-later.json": record("0010", ["team-management/roles"]),
      "0002-earlier.json": record("0002", ["team-management/roles"]),
    };

    expect(decisionsFor("team-management/roles").map((r) => r.id)).toEqual([
      "0002",
      "0010",
    ]);
  });

  it("returns an empty list for a capability with no records", () => {
    mockFiles = {
      "0001-elsewhere.json": record("0001", ["team-management/roles"]),
    };

    expect(decisionsFor("no-such-capability")).toEqual([]);
  });
});
