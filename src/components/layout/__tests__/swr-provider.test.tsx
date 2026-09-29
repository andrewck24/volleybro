import { SWRProvider } from "@/components/layout/swr-provider";
import { Toaster } from "@/components/ui/toaster";
import { API_UNAUTHORIZED_EVENT, apiClient } from "@/lib/api/api-client";
import { act, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import useSWR from "swr";

import { server } from "../../../../test/msw/server";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Requests the URL through SWR, so a failure reaches the provider's onError.
const Probe = () => {
  useSWR("/api/probe", (url: string) => apiClient(url), {
    shouldRetryOnError: false,
  });
  return null;
};

const renderProvider = (children: React.ReactNode = <span>child</span>) =>
  render(
    <SWRProvider>
      {children}
      <Toaster />
    </SWRProvider>,
  );

const respondWith = (status: number, body: object) =>
  server.use(http.get("/api/probe", () => HttpResponse.json(body, { status })));

const fireUnauthorized = () =>
  act(() => {
    window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT));
  });

describe("SWRProvider", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders children", () => {
    renderProvider();
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("shows an error toast when a request fails", async () => {
    respondWith(500, { code: "UNEXPECTED", reason: "UNHANDLED_ERROR" });

    renderProvider(<Probe />);

    expect(await screen.findByText("哎呀，發球掛網！")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects to sign-in once, with a session-expired toast, on a 401 response", async () => {
    respondWith(401, { code: "AUTHENTICATION", reason: "SESSION_REQUIRED" });

    renderProvider(<Probe />);

    expect(await screen.findByText("登入逾期")).toBeInTheDocument();
    // The request error and the unauthorized event both fire for this 401.
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/auth/sign-in");
  });

  describe("api:unauthorized event listener", () => {
    it("redirects to sign-in when the event is dispatched", () => {
      renderProvider();

      fireUnauthorized();

      expect(mockPush).toHaveBeenCalledWith("/auth/sign-in");
    });

    it("redirects only once when two events fire in quick succession", () => {
      renderProvider();

      fireUnauthorized();
      fireUnauthorized();

      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it("stops listening on unmount", () => {
      const { unmount } = renderProvider();

      unmount();
      fireUnauthorized();

      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
