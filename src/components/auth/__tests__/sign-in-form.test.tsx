import SignInForm from "@/components/auth/sign-in/form";
import { authClient } from "@/lib/auth-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

jest.mock("react-icons/fc", () => ({
  FcGoogle: () => <span data-testid="google-icon">G</span>,
}));

jest.mock("react-icons/ri", () => ({
  RiAlertLine: () => <span>!</span>,
  RiLoader4Line: () => <span data-testid="spinner">spinner</span>,
}));

jest.mock("@/components/custom/logo", () => ({
  Logo: () => <div>Logo</div>,
}));

const mockSignIn = authClient.signIn.social as jest.Mock;

describe("SignInForm submitting state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables Google button and shows spinner while signing in", async () => {
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
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

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
