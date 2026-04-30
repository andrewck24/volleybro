"use client";

import React from "react";
import { render, act } from "@testing-library/react";
import { ApiClientError } from "@/lib/api/api-client";
import type { ApiError } from "@/lib/api/parse-api-error";

let capturedOnError: ((error: unknown) => void) | undefined;

jest.mock("swr", () => ({
  SWRConfig: ({
    value,
    children,
  }: {
    value: { onError: (error: unknown) => void };
    children: React.ReactNode;
  }) => {
    capturedOnError = value.onError;
    return <>{children}</>;
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

const mockHandle401Redirect = jest.fn();
const mockShowErrorToast = jest.fn();

jest.mock("@/lib/api/error-toast", () => ({
  handle401Redirect: (...args: unknown[]) => mockHandle401Redirect(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { SWRProvider } from "@/components/layout/swr-provider";

function makeApiClientError(status: number): ApiClientError {
  const info: ApiError = {
    code: "UNEXPECTED",
    reason: "TEST",
    detail: "test error",
    status,
  };
  return new ApiClientError("test error", info);
}

describe("SWRProvider", () => {
  beforeEach(() => {
    capturedOnError = undefined;
    mockHandle401Redirect.mockClear();
    mockShowErrorToast.mockClear();
    mockToast.mockClear();
  });

  it("renders children", () => {
    const { getByText } = render(
      <SWRProvider>
        <span>child</span>
      </SWRProvider>,
    );
    expect(getByText("child")).toBeTruthy();
  });

  describe("onError callback", () => {
    it("delegates all errors to showErrorToast (including 401)", () => {
      render(
        <SWRProvider>
          <span />
        </SWRProvider>,
      );
      capturedOnError!(makeApiClientError(401));
      expect(mockShowErrorToast).toHaveBeenCalledTimes(1);
    });

    it("does NOT call handle401Redirect from onError", () => {
      render(
        <SWRProvider>
          <span />
        </SWRProvider>,
      );
      capturedOnError!(makeApiClientError(401));
      expect(mockHandle401Redirect).not.toHaveBeenCalled();
    });
  });

  describe("api:unauthorized event listener", () => {
    it("calls handle401Redirect when api:unauthorized event is dispatched", () => {
      render(
        <SWRProvider>
          <span />
        </SWRProvider>,
      );
      act(() => {
        window.dispatchEvent(new CustomEvent("api:unauthorized"));
      });
      expect(mockHandle401Redirect).toHaveBeenCalledTimes(1);
    });

    it("removes event listener on unmount", () => {
      const { unmount } = render(
        <SWRProvider>
          <span />
        </SWRProvider>,
      );
      unmount();
      act(() => {
        window.dispatchEvent(new CustomEvent("api:unauthorized"));
      });
      expect(mockHandle401Redirect).not.toHaveBeenCalled();
    });
  });
});
