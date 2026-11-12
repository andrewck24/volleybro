import SignInForm from "@/components/auth/sign-in/form";
import { authClient } from "@/lib/auth-client";
import { deferred } from "@test/support/gates";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: jest.fn(),
    },
  },
}));

let mockSearch = "";
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mockSignIn = authClient.signIn.social as jest.Mock;

describe("SignInForm submitting state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = "";
  });

  it("disables Google button and marks it busy while signing in", async () => {
    const { promise, release } = deferred();
    mockSignIn.mockReturnValue(promise);

    const user = userEvent.setup();
    render(<SignInForm />);

    const btn = screen.getByRole("button", { name: /google/i });
    expect(btn).toBeEnabled();

    await user.click(btn);

    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");

    release();
    await waitFor(() => expect(btn).toBeEnabled());
  });

  it("re-enables button after sign-in error", async () => {
    mockSignIn.mockRejectedValue(new Error("network error"));

    const user = userEvent.setup();
    render(<SignInForm />);

    const btn = screen.getByRole("button", { name: /google/i });
    await user.click(btn);

    await waitFor(() => expect(btn).toBeEnabled());
  });
});

describe("SignInForm OAuth errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = "";
  });

  it("sends a failed sign-in back to this page, not Better Auth's error page", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.click(screen.getByRole("button", { name: /google/i }));

    expect(mockSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ errorCallbackURL: "/auth/sign-in" }),
    );
  });

  it("shows no alert without an error", () => {
    render(<SignInForm />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tells the user they cancelled at Google", () => {
    mockSearch = "error=access_denied";
    render(<SignInForm />);
    expect(screen.getByRole("alert")).toHaveTextContent("已取消登入");
  });

  it("does not render raw OAuth error query parameters", () => {
    mockSearch =
      "error=unable_to_get_user_info&error_description=%3Cb%3Einjected%3C%2Fb%3E";
    render(<SignInForm />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("登入失敗");
    expect(alert).not.toHaveTextContent("injected");
    expect(alert).not.toHaveTextContent("unable_to_get_user_info");
    expect(document.body).not.toHaveTextContent("error_description");
  });
});
