export type DeviceConfig = {
  media: string;
  width: number;
  height: number;
};

// The apple-splash route serves images as `immutable`, so a design change at
// the same URL is never re-fetched by CDN / service worker / browser. Bump this
// whenever the splash rendering changes to move the URL and bust those caches.
// (iOS home-screen installs still cache the splash at install time — those need
// a remove-and-re-add; this only fixes the HTTP-cache layers.)
export const SPLASH_VERSION = "2";

export const devices: DeviceConfig[] = [
  // iPhone (existing 9)
  {
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    width: 750,
    height: 1334,
  },
  {
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    width: 828,
    height: 1792,
  },
  {
    media:
      "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1080,
    height: 1920,
  },
  {
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1125,
    height: 2436,
  },
  {
    media:
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1170,
    height: 2532,
  },
  {
    media:
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1179,
    height: 2556,
  },
  {
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1242,
    height: 2688,
  },
  {
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1284,
    height: 2778,
  },
  {
    media:
      "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1290,
    height: 2796,
  },
  // iPhone 17 generation (new 3)
  {
    media:
      "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1206,
    height: 2622,
  },
  {
    media:
      "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1320,
    height: 2868,
  },
  {
    media:
      "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    width: 1260,
    height: 2736,
  },
  // iPad portrait (new 3)
  {
    media:
      "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    width: 1488,
    height: 2266,
  },
  {
    media:
      "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    width: 1640,
    height: 2360,
  },
  {
    media:
      "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    width: 2048,
    height: 2732,
  },
];

const supportedSet = new Set(devices.map((d) => `${d.width}x${d.height}`));

export function isSupportedSize(w: number, h: number): boolean {
  return supportedSet.has(`${w}x${h}`);
}
