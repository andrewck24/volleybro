import { useEffect, useState, useCallback } from "react";

/**
 * React hook that checks if a media query matches the current window.
 * @param {string} query - Media query string (e.g., '(min-width: 768px)', '(prefers-color-scheme: dark)')
 * @returns {boolean} - Returns true if the media query matches, false otherwise
 */
export const useMediaQuery = (query: string): boolean => {
  // 創建一個函數用於同步獲取媒體查詢結果
  const getMatches = useCallback((): boolean => {
    // 確保我們在瀏覽器環境中
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  }, [query]);

  // 使用函數初始化狀態，只在客戶端執行
  const [matches, setMatches] = useState<boolean>(() => getMatches());

  useEffect(() => {
    if (typeof window === "undefined") return;

    setMatches(getMatches());

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    mediaQueryList.addEventListener("change", listener);

    return () => {
      mediaQueryList.removeEventListener("change", listener);
    };
  }, [query, getMatches]);

  return matches;
};
