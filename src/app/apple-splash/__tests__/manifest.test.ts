import manifest from "../../../../public/manifest.json";

describe("PWA manifest", () => {
  it("uses the light page background as its launch fallback", () => {
    expect(manifest.background_color).toBe("#f2f2f6");
  });
});
