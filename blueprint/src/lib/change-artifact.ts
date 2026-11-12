export type ChangeArtifactEntry = {
  id: string;
  slug: string;
  status: string;
  liveRevisionId: string | null;
  draftRevisionId: string | null;
};

export type ChangeArtifactStore = {
  get(key: string): Promise<{
    body: ReadableStream<Uint8Array>;
    httpEtag: string;
    customMetadata?: Record<string, string>;
  } | null>;
};

const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/u;
const RENDERER_ID = /^[a-f0-9]{40,64}$/u;

export function changeArtifactKey(
  rendererId: string,
  contentId: string,
  revisionId: string,
  visibility: "public" | "preview",
): string {
  if (
    !RENDERER_ID.test(rendererId) ||
    !IDENTIFIER.test(contentId) ||
    !IDENTIFIER.test(revisionId)
  ) {
    throw new Error("Invalid Change artifact identity.");
  }
  return `blueprint-pages/v1/${rendererId}/${visibility}/${contentId}/${revisionId}.html`;
}

export function changeArtifactMetadata(
  value: unknown,
  identity: {
    rendererId: string;
    contentId: string;
    slug: string;
    revisionId: string;
    visibility: "public" | "preview";
  },
): { contentHash: string; scenarioCount: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.slug !== "string" ||
    !data.slug ||
    data.slug !== identity.slug ||
    data.rendererId !== identity.rendererId ||
    data.contentId !== identity.contentId ||
    data.revisionId !== identity.revisionId ||
    data.visibility !== identity.visibility ||
    typeof data.contentSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(data.contentSha256) ||
    typeof data.scenarioCount !== "string" ||
    !/^(?:0|[1-9][0-9]*)$/u.test(data.scenarioCount)
  )
    return null;
  const scenarioCount = Number(data.scenarioCount);
  if (!Number.isSafeInteger(scenarioCount)) return null;
  return { contentHash: data.contentSha256, scenarioCount };
}

function unavailable(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...(status === 503 ? { "Retry-After": "15" } : {}),
    },
  });
}

export async function serveChangeArtifact({
  request,
  slug,
  entry,
  rendererId,
  store,
  preview,
}: {
  request: Request;
  slug: string;
  entry: ChangeArtifactEntry | null;
  rendererId: string;
  store?: ChangeArtifactStore;
  preview?: { collection: string; id: string };
}): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = unavailable(405, "此頁面僅接受 GET 或 HEAD。");
    response.headers.set("Allow", "GET, HEAD");
    return response;
  }
  const hasPreviewToken = new URL(request.url).searchParams.has("_preview");
  const isPreview =
    hasPreviewToken && preview?.collection === "blueprint_changes";
  if (hasPreviewToken && !isPreview) {
    return unavailable(403, "私密預覽連結無效或已過期。");
  }
  if (
    !entry ||
    entry.slug !== slug ||
    (isPreview ? preview.id !== entry.id : entry.status !== "published")
  ) {
    return unavailable(404, "找不到這篇 Change。");
  }
  const revisionId = isPreview
    ? (entry.draftRevisionId ?? entry.liveRevisionId)
    : entry.liveRevisionId;
  if (!revisionId) return unavailable(503, "頁面產物尚未就緒，請稍後重試。");

  let key: string;
  try {
    key = changeArtifactKey(
      rendererId,
      entry.id,
      revisionId,
      isPreview ? "preview" : "public",
    );
  } catch {
    return unavailable(503, "頁面產物版本尚未就緒。");
  }
  if (!store) return unavailable(503, "頁面儲存空間尚未就緒。");
  const artifact = await store.get(key);
  if (!artifact) return unavailable(503, "頁面產物尚未就緒，請稍後重試。");
  const metadata = changeArtifactMetadata(artifact.customMetadata, {
    rendererId,
    contentId: entry.id,
    slug,
    revisionId,
    visibility: isPreview ? "preview" : "public",
  });
  if (!metadata) {
    await artifact.body.cancel();
    return unavailable(503, "頁面產物驗證未通過。");
  }
  if (request.method === "HEAD") await artifact.body.cancel();
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    ETag: artifact.httpEtag,
  });
  if (isPreview) {
    headers.set("Vary", "Cookie");
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  headers.set("X-Blueprint-Content-SHA256", metadata.contentHash);
  return new Response(request.method === "HEAD" ? null : artifact.body, {
    status: 200,
    headers,
  });
}
