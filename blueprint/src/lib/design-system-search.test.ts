import { visibleShowcaseText } from "./design-system-search";

describe("visibleShowcaseText", () => {
  it("keeps reader-facing copy and inline names while excluding code examples", () => {
    const text = visibleShowcaseText(
      "<main><h3>AnnotatedDiff</h3><p>Highlights <code>RiskTable</code>.</p><pre><code>sidebar={{ tabs: [] }} // New peer tab</code></pre></main>",
    );

    expect(text).toContain("AnnotatedDiff");
    expect(text).toContain("Highlights");
    expect(text).toContain("RiskTable");
    expect(text).not.toContain("sidebar");
    expect(text).not.toContain("New peer tab");
  });
});
