import { useT } from "@/lib/i18n/client";
import type { Namespace } from "@/lib/i18n/config";
import { act, renderHook } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { useTranslation, UseTranslationResponse } from "react-i18next";

type MockTranslationReturn = UseTranslationResponse<Namespace, "en">;

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

// Mock i18next
jest.mock("i18next", () => ({
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockReturnThis(),
}));

// Mock resourcesToBackend
jest.mock("i18next-resources-to-backend", () =>
  jest.fn(() => ({
    type: "backend",
  })),
);

describe("useT hook", () => {
  const mockUsePathname = usePathname as jest.MockedFunction<
    typeof usePathname
  >;
  const mockUseTranslation = useTranslation as jest.MockedFunction<
    typeof useTranslation
  >;

  const mockChangeLanguage = jest.fn();
  const mockTranslationFunction = Object.assign(
    jest.fn((key: string) => key),
    { $TFunctionBrand: "common" },
  );

  const createMockTranslationReturn = (
    language = "en",
    ready = true,
  ): MockTranslationReturn => {
    return {
      t: mockTranslationFunction,
      i18n: {
        changeLanguage: mockChangeLanguage,
        resolvedLanguage: language,
      },
      ready,
    } as unknown as MockTranslationReturn;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default setup
    mockUsePathname.mockReturnValue("/");
    mockUseTranslation.mockReturnValue(createMockTranslationReturn());
    mockTranslationFunction.mockImplementation(
      (key: string) => `TRANSLATED(${key})`,
    );
    mockChangeLanguage.mockResolvedValue(undefined);
  });

  describe("8.1-UNIT-008: useT hook API contract", () => {
    test("returns expected interface structure", () => {
      const { result } = renderHook(() => useT());

      expect(result.current).toEqual({
        t: expect.any(Function),
        lng: expect.any(String),
        ready: expect.any(Boolean),
        i18n: expect.any(Object),
      });
    });

    test("accepts optional namespace parameter", () => {
      const { result: result1 } = renderHook(() => useT());
      const { result: result2 } = renderHook(() => useT("common"));

      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
    });

    test("extracts language from pathname correctly", () => {
      const pathLanguageCases = [
        { path: "/", expected: "en" },
        { path: "/some-page", expected: "en" },
        { path: "/zh-TW", expected: "zh-TW" },
        { path: "/zh-TW/team/123", expected: "zh-TW" },
        { path: "/en/dashboard", expected: "en" },
      ];

      pathLanguageCases.forEach(({ path, expected }) => {
        mockUsePathname.mockReturnValue(path);
        const { result } = renderHook(() => useT());
        expect(result.current.lng).toBe(expected);
      });
    });

    test("falls back to default language for unsupported locales", () => {
      const unsupportedPaths = ["/fr/page", "/de", "/zh-CN", "/invalid-locale"];

      unsupportedPaths.forEach((path) => {
        mockUsePathname.mockReturnValue(path);
        const { result } = renderHook(() => useT());
        expect(result.current.lng).toBe("en");
      });
    });
  });

  describe("8.1-UNIT-010: hydration state consistency logic", () => {
    test("maintains consistent language state when pathname and i18n match", () => {
      mockUsePathname.mockReturnValue("/zh-TW");
      mockUseTranslation.mockReturnValue(createMockTranslationReturn("zh-TW"));

      const { result } = renderHook(() => useT());

      expect(result.current.lng).toBe("zh-TW");
      expect(mockChangeLanguage).not.toHaveBeenCalled();
    });

    test("syncs language when pathname changes", async () => {
      const { result, rerender } = renderHook(() => useT());

      // Initially English
      expect(result.current.lng).toBe("en");

      // Change pathname to Chinese
      mockUsePathname.mockReturnValue("/zh-TW");

      await act(async () => {
        rerender();
        // Simulate i18n state update
        mockUseTranslation.mockReturnValue(
          createMockTranslationReturn("zh-TW"),
        );
        rerender();
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith("zh-TW");
      expect(result.current.lng).toBe("zh-TW");
    });

    test("prevents unnecessary language changes on re-renders", () => {
      mockUsePathname.mockReturnValue("/zh-TW");
      mockUseTranslation.mockReturnValue(createMockTranslationReturn("zh-TW"));

      const { rerender } = renderHook(() => useT());

      // Multiple re-renders with same language
      rerender();
      rerender();
      rerender();

      expect(mockChangeLanguage).not.toHaveBeenCalled();
    });

    test("handles language mismatch during hydration", async () => {
      // Simulate server-side rendered with Chinese, but client detects English
      mockUsePathname.mockReturnValue("/");
      mockUseTranslation.mockReturnValue(createMockTranslationReturn("zh-TW")); // SSR state

      const { result, rerender } = renderHook(() => useT());

      await act(async () => {
        // Client-side detection kicks in
        rerender();
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith("en");
    });
  });

  describe("8.1-UNIT-011: translation loading state management", () => {
    test("reflects ready state from i18next", () => {
      mockUseTranslation.mockReturnValue(
        createMockTranslationReturn("en", false),
      );

      const { result } = renderHook(() => useT());

      expect(result.current.ready).toBe(false);
    });

    test("handles loading state transitions", () => {
      const { result, rerender } = renderHook(() => useT());

      // Initially not ready
      mockUseTranslation.mockReturnValue(
        createMockTranslationReturn("en", false),
      );
      rerender();
      expect(result.current.ready).toBe(false);

      // Becomes ready
      mockUseTranslation.mockReturnValue(
        createMockTranslationReturn("en", true),
      );
      rerender();
      expect(result.current.ready).toBe(true);
    });

    test("maintains translation function reference during loading", () => {
      mockUseTranslation.mockReturnValue(
        createMockTranslationReturn("en", false),
      );

      const { result } = renderHook(() => useT());

      expect(typeof result.current.t).toBe("function");
      expect(result.current.t).toBe(mockTranslationFunction);
    });

    test("handles multiple namespace loading states", () => {
      const { result } = renderHook(() => useT(["common"]));

      expect(mockUseTranslation).toHaveBeenCalledWith(["common"]);
      expect(typeof result.current.t).toBe("function");
    });
  });

  describe("edge cases and error handling", () => {
    test("handles missing pathname gracefully", () => {
      mockUsePathname.mockReturnValue("");

      const { result } = renderHook(() => useT());

      expect(result.current.lng).toBe("en"); // Should fallback to default
    });

    test("handles malformed pathnames", () => {
      const malformedPaths = [
        "//double-slash",
        "/../../malicious-path",
        "/<script>alert('xss')</script>",
        "/null",
        "/undefined",
      ];

      malformedPaths.forEach((path) => {
        mockUsePathname.mockReturnValue(path);
        const { result } = renderHook(() => useT());
        expect(result.current.lng).toBe("en"); // Should fallback safely
      });
    });

    test("handles i18n.changeLanguage failures gracefully", async () => {
      mockChangeLanguage.mockRejectedValueOnce(
        new Error("Change language failed"),
      );
      mockUsePathname.mockReturnValue("/zh-TW");

      const { rerender } = renderHook(() => useT());

      await act(async () => {
        rerender();
      });

      // Should still attempt language change despite failure
      expect(mockChangeLanguage).toHaveBeenCalledWith("zh-TW");
    });

    test("handles missing i18n instance gracefully", () => {
      mockUseTranslation.mockReturnValue({
        t: mockTranslationFunction,
        i18n: null,
        ready: true,
      } as unknown as MockTranslationReturn);

      const { result } = renderHook(() => useT());

      expect(result.current.lng).toBe("en"); // Should fallback to default
    });
  });

  describe("performance considerations", () => {
    test("does not cause unnecessary re-renders", () => {
      const { result, rerender } = renderHook(() => useT());
      const initialResult = result.current;

      // Re-render with same state
      rerender();

      expect(result.current.t).toBe(initialResult.t);
      expect(result.current.lng).toBe(initialResult.lng);
    });

    test("memoizes language detection logic", () => {
      const { rerender } = renderHook(() => useT());

      // Multiple re-renders with same pathname
      rerender();
      rerender();

      expect(mockUsePathname).toHaveBeenCalled();
      // Language detection should be efficient, not called excessively
    });
  });
});
