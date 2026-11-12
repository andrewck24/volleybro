import {
  acceptedContentHash,
  acceptedContentHashFromValidatedChange,
  blockSchema,
  changeDataSchema,
} from "./emdash-change-record";

const content = {
  title: "Example Change",
  linear_issue: "TEST-123",
  pull_requests: [{ url: "https://github.com/andrewck24/volleybro/pull/552" }],
  blocks: [
    {
      _type: "scenario",
      _version: 1,
      id: "S1",
      given: "A",
      when: "B",
      then: "C",
    },
  ],
};

describe("EmDash Change schema", () => {
  it("accepts only allowlisted same-repository PR URLs", () => {
    expect(changeDataSchema.safeParse(content).success).toBe(true);
    expect(
      changeDataSchema.safeParse({
        ...content,
        pull_requests: [{ url: "https://github.com/another/repo/pull/552" }],
      }).success,
    ).toBe(false);
  });

  it("does not require a Linear issue", () => {
    const { linear_issue: _linearIssue, ...withoutIssue } = content;
    expect(changeDataSchema.safeParse(withoutIssue).success).toBe(true);
  });

  it("fails closed on an unknown block type", () => {
    expect(
      blockSchema.safeParse({
        _type: "custom-script",
        _version: 1,
        source: "alert(1)",
      }).success,
    ).toBe(false);
    expect(
      blockSchema.safeParse({
        _type: "scenario",
        _version: 1,
        id: "S1",
        given: "A",
        when: "B",
        then: "C",
        executable: "alert(1)",
      }).success,
    ).toBe(false);
  });

  it("accepts bounded interactive flowchart v2 and rejects the retired v1 contract", () => {
    const block = {
      _type: "interactive_flowchart",
      _version: 2,
      source: 'flowchart LR\n  A["Node A"]',
      details: JSON.stringify({ A: { title: "Node A", body: "Details" } }),
    };
    const parsed = blockSchema.safeParse(block);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data._type === "interactive_flowchart") {
      expect(parsed.data.paths).toBe("[]");
    }

    expect(
      blockSchema.safeParse({
        _type: "interactive_flowchart",
        _version: 1,
        nodes: "[]",
        edges: "[]",
        details: "{}",
      }).success,
    ).toBe(false);
  });

  it("rejects unsafe flowchart directives and path IDs outside the source", () => {
    const block = {
      _type: "interactive_flowchart",
      _version: 2,
      source: 'flowchart LR\n  A["Node A"]',
      details: "{}",
      paths: JSON.stringify([
        { id: "route", label: "Route", nodeIds: ["missing"] },
      ]),
    };
    expect(blockSchema.safeParse(block).success).toBe(false);
    expect(
      blockSchema.safeParse({
        ...block,
        details: JSON.stringify({ missing: { title: "Missing", body: "" } }),
        paths: "[]",
      }).success,
    ).toBe(false);
    expect(
      blockSchema.safeParse({
        ...block,
        source:
          'flowchart LR\n  %%{init: {"flowchart": {"htmlLabels": true}}}%%\n  A["Node A"]',
        paths: "[]",
      }).success,
    ).toBe(false);
  });

  it.each([
    { nodeIds: ["A", "B", "C"], accepted: true },
    { nodeIds: ["A", "C"], accepted: false },
  ])(
    "requires connected steps in a named path ($nodeIds)",
    ({ nodeIds, accepted }) => {
      expect(
        blockSchema.safeParse({
          _type: "interactive_flowchart",
          _version: 2,
          source: 'flowchart LR\n  A["Start"] --> B["Work"] --> C["Done"]',
          details: "{}",
          paths: JSON.stringify([{ id: "route", label: "Route", nodeIds }]),
        }).success,
      ).toBe(accepted);
    },
  );

  it("rejects source node IDs outside the shared node ID contract", () => {
    expect(
      blockSchema.safeParse({
        _type: "interactive_flowchart",
        _version: 2,
        source: 'flowchart LR\n  "bad id"["Node"]',
        details: "{}",
        paths: "[]",
      }).success,
    ).toBe(false);
  });

  it.each([undefined, ""])(
    "rejects a scenario without a nonempty ID (%s)",
    (id) => {
      expect(blockSchema.safeParse({ ...content.blocks[0], id }).success).toBe(
        false,
      );
    },
  );

  it("accepts version 1 TL;DR blocks containing native Portable Text", () => {
    expect(
      blockSchema.safeParse({
        _type: "tldr",
        _version: 1,
        blocks: [
          {
            _type: "block",
            _key: "tldr-text",
            id: "tldr-summary",
            children: [{ _type: "span", text: "Summary" }],
          },
          {
            _type: "image",
            asset: {
              _type: "reference",
              _ref: "media-1",
              url: "/_emdash/api/media/file/media-1.png",
            },
            alt: "Summary illustration",
          },
          { _type: "code", code: "const ready = true;", language: "ts" },
          {
            _type: "table",
            rows: [
              {
                _type: "tableRow",
                _key: "tldr-row",
                cells: [
                  {
                    _type: "tableCell",
                    _key: "tldr-cell",
                    content: [{ _type: "span", text: "Ready" }],
                  },
                ],
              },
            ],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts typed blocks with or without _version and keeps a stored key", () => {
    const scenario = {
      _type: "scenario",
      id: "S1",
      given: "A",
      when: "B",
      then: "C",
    };
    expect(blockSchema.safeParse(scenario).success).toBe(true);
    const stored = { ...scenario, _version: 1 };
    const parsed = blockSchema.safeParse(stored);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual(stored);
  });

  it("rejects raw and unknown TL;DR content", () => {
    const tldr = {
      _type: "tldr",
      _version: 1,
      blocks: [
        {
          _type: "block",
          children: [{ _type: "span", text: "Summary" }],
        },
      ],
    };

    expect(
      blockSchema.safeParse({
        ...tldr,
        blocks: [{ _type: "html", html: "<script>unsafe()</script>" }],
      }).success,
    ).toBe(false);
    expect(
      blockSchema.safeParse({
        ...tldr,
        blocks: [{ _type: "unknown", payload: "unsafe" }],
      }).success,
    ).toBe(false);
  });

  it("preserves nested typed blocks through full Change validation", () => {
    const result = changeDataSchema.safeParse({
      ...content,
      blocks: [
        {
          _type: "disclosure",
          _version: 1,
          _key: "review-details",
          id: "review",
          summary: "Review details",
          blocks: [
            {
              _type: "block",
              _key: "review-body",
              id: "review-body-anchor",
              children: [{ _type: "span", text: "Full review notes." }],
            },
            { _type: "risk_table", _version: 1, risks: "[]" },
            {
              _type: "diagram",
              _version: 1,
              title: "Review flow",
              viewBox: { x: 0, y: 0, width: 10, height: 10 },
              elements: [
                {
                  type: "rect",
                  id: "review-node",
                  x: 1,
                  y: 1,
                  width: 8,
                  height: 8,
                },
              ],
            },
            {
              _type: "disclosure",
              _version: 1,
              _key: "review-shard-1",
              id: "review-s1",
              summary: "Shard 1",
              blocks: [
                { _type: "decision_cards", _version: 1, records: "[]" },
                {
                  _type: "block",
                  id: "shard-note",
                  children: [{ _type: "span", text: "Shard review note." }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    const review = result.data.blocks[0];
    expect(review._type).toBe("disclosure");
    if (review._type !== "disclosure") return;
    expect(review.id).toBe("review");
    expect(review.summary).toBe("Review details");
    expect(review.blocks.map((block) => block._type)).toEqual([
      "block",
      "risk_table",
      "diagram",
      "disclosure",
    ]);
    expect(review.blocks[0]).toMatchObject({ id: "review-body-anchor" });
    expect(review.blocks[2]).toMatchObject({ title: "Review flow" });
    const shard = review.blocks[3];
    expect(shard._type).toBe("disclosure");
    if (shard._type === "disclosure") {
      expect(shard.id).toBe("review-s1");
      expect(shard.blocks.map((block) => block._type)).toEqual([
        "decision_cards",
        "block",
      ]);
      expect(shard.blocks[1]).toMatchObject({ id: "shard-note" });
    }
  });

  it("rejects unknown, raw, and unsafe-link disclosure content", () => {
    const disclosure = {
      _type: "disclosure",
      _version: 1,
      summary: "Review details",
      blocks: [{ _type: "block", children: [{ _type: "span", text: "OK" }] }],
    };
    const invalidBlocks = [
      [{ _type: "unknown", payload: "unsafe" }],
      [{ _type: "html", html: "<script>unsafe()</script>" }],
      [
        {
          _type: "block",
          children: [{ _type: "span", text: "unsafe", marks: ["bad-link"] }],
          markDefs: [
            { _key: "bad-link", _type: "link", href: "javascript:alert(1)" },
          ],
        },
      ],
    ];

    for (const blocks of invalidBlocks) {
      expect(blockSchema.safeParse({ ...disclosure, blocks }).success).toBe(
        false,
      );
    }
    expect(
      blockSchema.safeParse({ ...disclosure, id: "bad anchor" }).success,
    ).toBe(false);
    expect(
      blockSchema.safeParse({ ...disclosure, summary: "  " }).success,
    ).toBe(false);
  });

  it("rejects disclosure nesting beyond the supported maximum", () => {
    let tooDeep: unknown = {
      _type: "disclosure",
      _version: 1,
      summary: "Level 1",
      blocks: [],
    };
    for (let level = 2; level <= 9; level += 1) {
      tooDeep = {
        _type: "disclosure",
        _version: 1,
        summary: `Level ${level}`,
        blocks: [tooDeep],
      };
    }

    const parsed = blockSchema.safeParse(tooDeep);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((issue) =>
          issue.message.includes("cannot be nested more than 8 levels"),
        ),
      ).toBe(true);
    }
  });

  it("accepts canonical Portable Text and typed blocks in one ordered stream", () => {
    const result = changeDataSchema.safeParse({
      ...content,
      blocks: [
        {
          _type: "block",
          _key: "heading-key",
          id: "portable-text-heading",
          style: "h2",
          children: [{ _type: "span", text: "History", marks: ["strong"] }],
        },
        {
          _type: "block",
          _key: "list-key",
          listItem: "bullet",
          level: 1,
          children: [{ _type: "span", text: "Preserved list item" }],
        },
        { _type: "code", code: "const answer = 42;", language: "ts" },
        {
          _type: "table",
          rows: [
            {
              _type: "tableRow",
              _key: "row-1",
              cells: [
                {
                  _type: "tableCell",
                  _key: "cell-1",
                  content: [{ _type: "span", _key: "span-1", text: "cell" }],
                },
              ],
            },
          ],
        },
        {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: "media-1",
            url: "/_emdash/api/media/file/media-1.png",
            provider: "local",
          },
          alt: "Diagram",
        },
        {
          _type: "scenario",
          _version: 1,
          id: "S2",
          given: "A",
          when: "B",
          then: "C",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts the native EmDash revision entry envelope", () => {
    const result = changeDataSchema.safeParse({
      ...content,
      id: "01JREVISIONENTRY",
      slug: "canonical-local-smoke",
      status: "draft",
      authorId: "author-1",
      primaryBylineId: null,
      createdAt: new Date("2026-10-14T00:00:00.000Z"),
      updatedAt: new Date("2026-10-14T00:00:00.000Z"),
      publishedAt: null,
      scheduledAt: null,
      draftRevisionId: null,
      liveRevisionId: null,
      locale: "en",
      translationGroup: null,
      seo: {
        title: null,
        description: null,
        image: null,
        canonical: null,
        noIndex: false,
      },
      bylines: [],
      byline: null,
      terms: {},
    });

    expect(result.success).toBe(true);
  });

  it("keeps loader author and taxonomy metadata outside the accepted content hash", async () => {
    const acceptedHash = await acceptedContentHash(content);
    const loaded = {
      ...content,
      description: null,
      bylines: [],
      byline: null,
      terms: {},
    };

    expect(changeDataSchema.safeParse(loaded).success).toBe(true);
    await expect(acceptedContentHash(loaded)).resolves.toBe(acceptedHash);
    expect(
      changeDataSchema.safeParse({ ...loaded, bylines: [{ arbitrary: true }] })
        .success,
    ).toBe(false);
    expect(
      changeDataSchema.safeParse({
        ...loaded,
        terms: { category: [{ id: "term", arbitrary: true }] },
      }).success,
    ).toBe(false);
  });

  it("preserves Unicode source anchors while rejecting unsafe IDs", () => {
    expect(
      blockSchema.safeParse({
        _type: "block",
        id: "３月測試-anchor",
        style: "h2",
        children: [{ _type: "span", text: "三月測試" }],
      }).success,
    ).toBe(true);
    expect(
      blockSchema.safeParse({
        _type: "block",
        id: "archive-assessment-與殘留工作",
        style: "h2",
        children: [{ _type: "span", text: "評估" }],
      }).success,
    ).toBe(true);
    expect(
      blockSchema.safeParse({
        _type: "block",
        id: "heading id",
        children: [{ _type: "span", text: "Unsafe" }],
      }).success,
    ).toBe(false);
    expect(
      blockSchema.safeParse({
        _type: "block",
        id: "　unsafe",
        children: [{ _type: "span", text: "Unsafe" }],
      }).success,
    ).toBe(false);
  });

  it("rejects unsafe links and unapproved HTML blocks", () => {
    expect(
      blockSchema.safeParse({
        _type: "htmlBlock",
        html: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);
    expect(
      blockSchema.safeParse({
        _type: "block",
        children: [{ _type: "span", text: "unsafe", marks: ["link-1"] }],
        markDefs: [
          { _key: "link-1", _type: "link", href: "javascript:alert(1)" },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts EmDash-owned keys and unknown marks on core blocks", () => {
    const parsed = blockSchema.safeParse({
      _type: "block",
      _key: "k1",
      style: "normal",
      listItem: "number",
      level: 1,
      listId: "legacy:x",
      listStart: 1,
      children: [{ _type: "span", text: "item", marks: ["future-mark"] }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success)
      expect(parsed.data).toMatchObject({ listId: "legacy:x", listStart: 1 });
  });

  it("rejects unknown content fields instead of dropping them before hashing", async () => {
    const unsafe = {
      ...content,
      private_notes: "not part of the approved schema",
    };
    expect(changeDataSchema.safeParse(unsafe).success).toBe(false);
    await expect(acceptedContentHash(unsafe)).rejects.toThrow(
      "Change content does not match",
    );
  });

  it("preserves the canonical digest for validated Change data", async () => {
    const validated = changeDataSchema.parse(content);
    const expected =
      "657805508a9f7d4d8c6a1f9165ed446ca933d65c451db491ca8d56304224b8d2";

    await expect(acceptedContentHash(content)).resolves.toBe(expected);
    await expect(
      acceptedContentHashFromValidatedChange(validated),
    ).resolves.toBe(expected);
  });

  it("hashes accepted fields in a stable order and excludes CMS metadata", async () => {
    const first = await acceptedContentHash(content);
    const second = await acceptedContentHash({
      blocks: content.blocks,
      linear_issue: content.linear_issue,
      title: content.title,
      id: "cms-id",
      status: "draft",
      draftRevisionId: "revision",
      authorId: "author-id",
      primaryBylineId: null,
      publishedAt: null,
      scheduledAt: null,
      locale: "en",
      translationGroup: null,
    });
    expect(first).toBe(second);
  });

  it("keeps PR association changes outside the G1 content hash", async () => {
    const before = await acceptedContentHash(content);
    const after = await acceptedContentHash({
      ...content,
      pull_requests: [
        { url: "https://github.com/andrewck24/volleybro/pull/553" },
      ],
    });
    expect(after).toBe(before);
  });

  it("binds canonical EmDash media identity to the accepted hash", async () => {
    const mediaContent = {
      title: "Historical Change",
      linear_issue: "TEST-123",
      blocks: [
        {
          _type: "image",
          _key: "image-key",
          alt: "Diagram",
          asset: {
            _type: "reference",
            _ref: "media-alpha",
            url: "/_emdash/api/media/file/media-alpha.png",
            provider: "local",
          },
        },
      ],
    };
    const acceptedHash = await acceptedContentHash(mediaContent);

    expect(
      changeDataSchema.safeParse({
        ...mediaContent,
        blocks: [
          {
            ...mediaContent.blocks[0],
            asset: {
              ...mediaContent.blocks[0].asset,
              url: "https://other.example/image.png",
            },
          },
        ],
      }).success,
    ).toBe(false);
    await expect(
      acceptedContentHash({
        ...mediaContent,
        blocks: [
          {
            ...mediaContent.blocks[0],
            asset: { ...mediaContent.blocks[0].asset, _ref: "media-other" },
          },
        ],
      }),
    ).resolves.not.toBe(acceptedHash);
  });

  it("accepts annotated diff blocks and preserves their typed payload", () => {
    const diff = {
      _type: "annotated_diff",
      _version: 1,
      _key: "diff-1",
      language: "ts",
      lines: [
        { kind: "context", text: "const ready = false;" },
        { kind: "remove", text: "const ready = false;" },
        { kind: "add", text: "const ready = true;" },
      ],
    };
    const parsed = blockSchema.safeParse(diff);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual(diff);
  });

  it("rejects invalid annotated diff kinds and raw HTML fields", () => {
    const diff = {
      _type: "annotated_diff",
      _version: 1,
      lines: [{ kind: "context", text: "safe" }],
    };
    for (const invalid of [
      { ...diff, lines: [{ kind: "script", text: "unsafe" }] },
      { ...diff, html: "<script>unsafe()</script>" },
    ]) {
      expect(blockSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("rejects a 1000-level unknown container without throwing", () => {
    let malformed: unknown = { _type: "block", children: [] };
    for (let level = 0; level < 1000; level += 1) {
      malformed = { _type: "unknown-container", blocks: [malformed] };
    }
    expect(() => {
      expect(blockSchema.safeParse(malformed).success).toBe(false);
    }).not.toThrow();
  });
});
