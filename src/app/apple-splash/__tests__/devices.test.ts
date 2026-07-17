import { devices, isSupportedSize } from "../devices";

describe("devices", () => {
  it("lists 15 device configs", () => {
    expect(devices).toHaveLength(15);
  });
});

describe("isSupportedSize", () => {
  it("returns true for a listed iPhone size", () => {
    expect(isSupportedSize(1290, 2796)).toBe(true);
  });

  it("returns true for a listed iPhone 17 size", () => {
    expect(isSupportedSize(1320, 2868)).toBe(true);
  });

  it("maps the iPhone 17 Pro viewport to its physical resolution", () => {
    expect(devices).toContainEqual({
      media:
        "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      width: 1206,
      height: 2622,
    });
  });

  it("returns true for a listed iPad size", () => {
    expect(isSupportedSize(2048, 2732)).toBe(true);
  });

  it("returns false for an unlisted size", () => {
    expect(isSupportedSize(100, 100)).toBe(false);
  });

  it("returns false when only one dimension matches", () => {
    expect(isSupportedSize(1290, 100)).toBe(false);
  });
});
