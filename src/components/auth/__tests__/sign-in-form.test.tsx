import SignInForm from "@/components/auth/sign-in/form";
import { authClient } from "@/lib/auth-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The Google sign-in redirects the whole window to the OAuth provider, which
// jsdom cannot follow, so the auth client is replaced.
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
    let resolveSignIn!: () => void;
    mockSignIn.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<SignInForm />);

    const btn = screen.getByRole("button", { name: /google/i });
    expect(btn).toBeEnabled();

    await user.click(btn);

    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");

    resolveSignIn();
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

  it("falls back to a fixed message and never echoes the URL", () => {
    mockSearch =
      "error=unable_to_get_user_info&error_description=%3Cb%3Einjected%3C%2Fb%3E";
    render(<SignInForm />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("登入失敗");
    expect(alert).not.toHaveTextContent("injected");
    expect(alert).not.toHaveTextContent("unable_to_get_user_info");
  });
});
