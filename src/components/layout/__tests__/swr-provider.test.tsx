"use client";

import React from "react";
import { render } from "@testing-library/react";
import { ApiClientError } from "@/lib/api/api-client";
import type { ApiError } from "@/lib/api/parse-api-error";

// Capture the onError callback from SWRConfig
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

// Import after mocks are set up
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

  it("calls handle401Redirect (not showErrorToast) when error is ApiClientError with status 401", () => {
    render(
      <SWRProvider>
        <span />
      </SWRProvider>,
    );
    expect(capturedOnError).toBeDefined();

    const error = makeApiClientError(401);
    capturedOnError!(error);

    expect(mockHandle401Redirect).toHaveBeenCalledTimes(1);
    expect(mockShowErrorToast).not.toHaveBeenCalled();
  });

  it("calls showErrorToast (not handle401Redirect) when error is ApiClientError with status 409", () => {
    render(
      <SWRProvider>
        <span />
      </SWRProvider>,
    );
    expect(capturedOnError).toBeDefined();

    const error = makeApiClientError(409);
    capturedOnError!(error);

    expect(mockShowErrorToast).toHaveBeenCalledTimes(1);
    expect(mockHandle401Redirect).not.toHaveBeenCalled();
  });
});
