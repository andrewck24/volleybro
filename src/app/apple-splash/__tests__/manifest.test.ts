import manifest from "../../../../public/manifest.json";

describe("PWA manifest", () => {
  it("uses the brand teal as its launch fallback", () => {
    expect(manifest.background_color).toBe("#10687e");
  });

  it("declares maskable icons at 192x192 and 512x512", () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose === "maskable",
    );

    expect(maskableIcons).toContainEqual({
      src: "/maskable-icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    });
    expect(maskableIcons).toContainEqual({
      src: "/maskable-icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    });
  });
});
