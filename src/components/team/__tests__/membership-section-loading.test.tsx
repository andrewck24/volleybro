import { MembershipSection } from "@/components/team/players/membership-section";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { apiClient } from "@/lib/api/api-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/api/api-client", () => ({ apiClient: jest.fn() }));
jest.mock("@/lib/api/error-toast", () => ({
  showErrorToast: jest.fn(),
  getErrorMessage: jest.fn(() => "error"),
}));
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock("@/components/team/role-select", () => ({
  RoleSelect: () => <select />,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: jest.fn() }),
}));
jest.mock("react-icons/ri", () => ({
  RiLoader4Line: () => <span data-testid="spinner">spinner</span>,
}));

const mockApiClient = apiClient as jest.Mock;

const basePlayer = {
  id: "player-1",
  name: "Alice",
  teamId: "team-1",
  role: PlayerRole.MEMBER,
  status: PlayerStatus.JOINED,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

describe("MembershipSection — remove loading state", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows loading and disables confirm button while removing", async () => {
    let resolveApi!: () => void;
    mockApiClient.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveApi = resolve;
      }),
    );

    const user = userEvent.setup();
    render(
      <MembershipSection
        player={basePlayer}
        teamId="team-1"
        isCurrentOwner={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /移除成員/ }));
    const confirmBtn = screen.getByRole("button", { name: /確認移除/ });
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);

    expect(confirmBtn).toBeDisabled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    resolveApi();
    await waitFor(() =>
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument(),
    );
  });

  it("re-enables confirm button after remove error", async () => {
    mockApiClient.mockRejectedValue(new Error("fail"));

    const user = userEvent.setup();
    render(
      <MembershipSection
        player={basePlayer}
        teamId="team-1"
        isCurrentOwner={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /移除成員/ }));
    const confirmBtn = screen.getByRole("button", { name: /確認移除/ });
    await user.click(confirmBtn);

    await waitFor(() => expect(confirmBtn).toBeEnabled());
  });
});

describe("MembershipSection — transfer loading state", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows loading and disables confirm button while transferring", async () => {
    let resolveApi!: () => void;
    mockApiClient.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveApi = resolve;
      }),
    );

    const user = userEvent.setup();
    render(
      <MembershipSection
        player={basePlayer}
        teamId="team-1"
        isCurrentOwner={true}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /移轉所有權給此球員/ }),
    );
    const confirmBtn = screen.getByRole("button", { name: /確認移轉/ });
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);

    expect(confirmBtn).toBeDisabled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    resolveApi();
    await waitFor(() =>
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument(),
    );
  });

  it("re-enables confirm button after transfer error", async () => {
    mockApiClient.mockRejectedValue(new Error("fail"));

    const user = userEvent.setup();
    render(
      <MembershipSection
        player={basePlayer}
        teamId="team-1"
        isCurrentOwner={true}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /移轉所有權給此球員/ }),
    );
    const confirmBtn = screen.getByRole("button", { name: /確認移轉/ });
    await user.click(confirmBtn);

    await waitFor(() => expect(confirmBtn).toBeEnabled());
  });
});
