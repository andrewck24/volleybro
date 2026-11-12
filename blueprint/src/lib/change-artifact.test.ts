import { changeArtifactKey, serveChangeArtifact } from "./change-artifact";

const rendererId = "a".repeat(64);
const entry = {
  id: "content-1",
  slug: "example",
  status: "published",
  liveRevisionId: "live-1",
  draftRevisionId: "draft-2",
};
const publicKey = changeArtifactKey(rendererId, entry.id, "live-1", "public");
const previewKey = changeArtifactKey(
  rendererId,
  entry.id,
  "draft-2",
  "preview",
);

function storage(objects: Record<string, string>) {
  return {
    get: jest.fn(async (key: string) =>
      objects[key] === undefined
        ? null
        : {
            body: new Response(objects[key]).body!,
            httpEtag: '"verified-artifact"',
            customMetadata: {
              contentSha256: "b".repeat(64),
              rendererId,
              contentId: entry.id,
              slug: entry.slug,
              revisionId: key === previewKey ? "draft-2" : "live-1",
              visibility: key === previewKey ? "preview" : "public",
              scenarioCount: "0",
            },
          },
    ),
  };
}

it("serves only the live revision publicly and the current draft through a verified preview", async () => {
  const store = storage({ [publicKey]: "live", [previewKey]: "private" });
  const common = { slug: entry.slug, entry, rendererId, store };
  const live = await serveChangeArtifact({
    ...common,
    request: new Request("https://example.test/changes/example"),
  });
  expect(await live.text()).toBe("live");
  const draft = await serveChangeArtifact({
    ...common,
    request: new Request(
      "https://example.test/changes/example?_preview=opaque",
    ),
    preview: { collection: "blueprint_changes", id: entry.id },
  });
  expect(await draft.text()).toBe("private");
  expect(draft.headers.get("Cache-Control")).toContain("no-store");
  expect(draft.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
});

it.each([
  undefined,
  { collection: "other", id: entry.id },
  { collection: "blueprint_changes", id: "other-content" },
])(
  "never reads an artifact for an invalid or differently scoped preview",
  async (preview) => {
    const store = storage({ [previewKey]: "private" });
    const response = await serveChangeArtifact({
      request: new Request(
        "https://example.test/changes/example?_preview=opaque",
      ),
      slug: entry.slug,
      entry,
      rendererId,
      store,
      preview,
    });
    expect([403, 404]).toContain(response.status);
    expect(await response.text()).not.toContain("private");
    expect(store.get).not.toHaveBeenCalled();
  },
);

it("does not expose an old revision or an unpublished page", async () => {
  const oldKey = changeArtifactKey(rendererId, entry.id, "draft-1", "preview");
  const store = storage({ [oldKey]: "old private", [publicKey]: "old live" });
  const response = await serveChangeArtifact({
    request: new Request(
      "https://example.test/changes/example?_preview=opaque",
    ),
    slug: entry.slug,
    entry,
    rendererId,
    store,
    preview: { collection: "blueprint_changes", id: entry.id },
  });
  expect(response.status).toBe(503);
  expect(response.headers.get("Retry-After")).toBe("15");
  expect(await response.text()).not.toContain("old private");
  const unpublished = await serveChangeArtifact({
    request: new Request("https://example.test/changes/example"),
    slug: entry.slug,
    entry: { ...entry, status: "draft" },
    rendererId,
    store,
  });
  expect(unpublished.status).toBe(404);
  expect(await unpublished.text()).not.toContain("old live");
});

it("never serves an artifact from another renderer version", async () => {
  const store = storage({ [publicKey]: "previous renderer" });
  const response = await serveChangeArtifact({
    request: new Request("https://example.test/changes/example"),
    slug: entry.slug,
    entry,
    rendererId: "c".repeat(64),
    store,
  });
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("previous renderer");
});

it("rejects corrupt artifact metadata and closes its body", async () => {
  const cancel = jest.fn();
  const store = {
    get: async () => ({
      body: new ReadableStream<Uint8Array>({ cancel }),
      httpEtag: '\"corrupt\"',
      customMetadata: { rendererId, contentId: "another-entry" },
    }),
  };
  const response = await serveChangeArtifact({
    request: new Request("https://example.test/changes/example"),
    slug: entry.slug,
    entry,
    rendererId,
    store,
  });
  expect(response.status).toBe(503);
  expect(cancel).toHaveBeenCalledTimes(1);
});

it("returns HEAD metadata without streaming HTML, and rejects mutating methods", async () => {
  const store = storage({ [publicKey]: "live" });
  const common = { slug: entry.slug, entry, rendererId, store };
  const head = await serveChangeArtifact({
    ...common,
    request: new Request("https://example.test/changes/example", {
      method: "HEAD",
    }),
  });
  expect(head.status).toBe(200);
  expect(head.headers.get("ETag")).toBe('"verified-artifact"');
  expect(await head.text()).toBe("");
  store.get.mockClear();
  const post = await serveChangeArtifact({
    ...common,
    request: new Request("https://example.test/changes/example", {
      method: "POST",
    }),
  });
  expect(post.status).toBe(405);
  expect(post.headers.get("Allow")).toBe("GET, HEAD");
  expect(store.get).not.toHaveBeenCalled();
});

it("does not serve an artifact carrying the previous slug even when revision is unchanged", async () => {
  const store = storage({ [publicKey]: "previous slug HTML" });
  const response = await serveChangeArtifact({
    request: new Request("https://example.test/changes/renamed"),
    slug: "renamed",
    entry: { ...entry, slug: "renamed" },
    rendererId,
    store,
  });
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("previous slug HTML");
});
