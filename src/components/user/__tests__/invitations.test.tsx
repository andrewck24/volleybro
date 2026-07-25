import { Invitations } from "@/components/user/invitations/index";
import { PlayerStatus } from "@/entities/player";
import { apiClient } from "@/lib/api/api-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const mockMutate = jest.fn();

jest.mock("@/hooks/use-data", () => ({
  useUser: () => ({ user: { id: "user-1" } }),
  useUserPlayers: () => ({
    players: [
      { id: "player-1", teamId: "team-1", status: PlayerStatus.INVITED },
      { id: "player-2", teamId: "team-2", status: PlayerStatus.INVITED },
    ],
    isLoading: false,
    mutate: mockMutate,
  }),
  useTeam: (teamId: string) => ({
    team: { id: teamId, name: `Team ${teamId}` },
    isLoading: false,
  }),
}));

jest.mock("@/lib/api/api-client", () => ({
  apiClient: jest.fn(),
}));

jest.mock("@/lib/api/error-toast", () => ({
  showErrorToast: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("react-icons/ri", () => ({
  RiCheckLine: () => <span>✓</span>,
  RiCloseLine: () => <span>✕</span>,
  RiGroupLine: () => <span>G</span>,
  RiLoader4Line: () => <span data-testid="spinner">spinner</span>,
}));

jest.mock("react-icons/fi", () => ({
  FiPlus: () => <span>+</span>,
}));

const mockApiClient = apiClient as jest.Mock;

describe("Invitations processingId state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate.mockResolvedValue(undefined);
  });

  it("disables all buttons while one invitation is processing", async () => {
    let resolveApi!: () => void;
    mockApiClient.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveApi = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<Invitations />);

    const acceptButtons = screen.getAllByRole("button", { name: /接受邀請/ });
    const rejectButtons = screen.getAllByRole("button", { name: /拒絕邀請/ });

    await user.click(acceptButtons[0]!);

    expect(acceptButtons[0]).toBeDisabled();
    expect(rejectButtons[0]).toBeDisabled();
    expect(acceptButtons[1]).toBeDisabled();
    expect(rejectButtons[1]).toBeDisabled();

    resolveApi();
    await waitFor(() => expect(acceptButtons[0]).toBeEnabled());
  });

  it("shows spinner on the clicked accept button while processing", async () => {
    let resolveApi!: () => void;
    mockApiClient.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveApi = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<Invitations />);

    const acceptButtons = screen.getAllByRole("button", { name: /接受邀請/ });
    await user.click(acceptButtons[0]!);

    expect(screen.getAllByTestId("spinner").length).toBeGreaterThanOrEqual(1);

    resolveApi();
    await waitFor(() =>
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument(),
    );
  });

  it("re-enables buttons after processing completes", async () => {
    mockApiClient.mockResolvedValue({});

    const user = userEvent.setup();
    render(<Invitations />);

    const acceptButtons = screen.getAllByRole("button", { name: /接受邀請/ });
    await user.click(acceptButtons[0]!);

    await waitFor(() => expect(acceptButtons[0]).toBeEnabled());
  });
});
