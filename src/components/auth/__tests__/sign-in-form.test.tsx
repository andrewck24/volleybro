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

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const mockSignIn = authClient.signIn.social as jest.Mock;

describe("SignInForm submitting state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
