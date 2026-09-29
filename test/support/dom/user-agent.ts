export const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
export const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
export const LINUX = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";
export const ANDROID =
  "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36";
export const iosUserAgent = (version: number) =>
  `Mozilla/5.0 (iPhone; CPU iPhone OS ${version}_0 like Mac OS X) AppleWebKit/605.1.15 Version/${version}.0`;

/** jsdom's user agent varies with the host OS, so platform detection needs it pinned. */
export const setUserAgent = (userAgent: string) =>
  jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
