import { createPlayer } from "@/__tests__/helpers";
import TeamInfo from "@/components/team/info/index";
import { type AppErrorCode } from "@/entities/errors";
import { ApiClientError } from "@/lib/api/api-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock apiClient
const mockApiClient = jest.fn();
jest.mock("@/lib/api/api-client", () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
  ApiClientError: jest.requireActual("@/lib/api/api-client").ApiClientError,
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), refresh: jest.fn() }),
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock use-data hooks
const currentUser = { id: "user-1", name: "Current User" };
const currentPlayer = createPlayer({ name: "Current User" });

const mockMutate = jest.fn();
jest.mock("@/hooks/use-data", () => ({
  useTeam: () => ({
    team: { id: "team-1", name: "Test Team", nickname: "TT" },
    isLoading: false,
  }),
  useTeamPlayers: () => ({
    players: [currentPlayer],
    isLoading: false,
    mutate: mockMutate,
  }),
  useUser: () => ({
    user: currentUser,
    isLoading: false,
  }),
}));

// Mock react-icons
jest.mock("react-icons/ri", () => ({
  RiEditBoxLine: () => <span>edit</span>,
  RiGroupLine: () => <span>group</span>,
  RiInformationLine: () => <span>info</span>,
  RiLoader4Line: () => <span>loading</span>,
}));

function createApiError(
  status: number,
  code: string,
  reason: string,
  detail: string,
) {
  return new ApiClientError(detail, {
    code: code as AppErrorCode,
    reason,
    status,
  });
}

describe("AlertDialog error state — TeamInfo handleLeaveTeam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show inline error message when leave team fails", async () => {
    const user = userEvent.setup();
    mockApiClient.mockRejectedValueOnce(
      createApiError(
        403,
        "AUTHORIZATION",
        "OWNER_CANNOT_LEAVE",
        "Team owner cannot leave the team",
      ),
    );

    render(<TeamInfo teamId="team-1" />);

    // Open the leave team dialog
    await user.click(screen.getByRole("button", { name: "離開隊伍" }));

    // Confirm leave
    await user.click(screen.getByRole("button", { name: "確認離開" }));

    // Error message should appear inline in dialog
    await waitFor(() => {
      expect(
        screen.getByText("請先把擁有權移轉給其他成員，再離開"),
      ).toBeInTheDocument();
    });

    // Dialog should still be visible
    expect(screen.getByText("確定要離開這個隊伍嗎？")).toBeInTheDocument();

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("should show branded message for server errors", async () => {
    const user = userEvent.setup();
    mockApiClient.mockRejectedValueOnce(
      createApiError(
        500,
        "UNEXPECTED",
        "UNHANDLED_ERROR",
        "An unexpected error occurred",
      ),
    );

    render(<TeamInfo teamId="team-1" />);

    await user.click(screen.getByRole("button", { name: "離開隊伍" }));
    await user.click(screen.getByRole("button", { name: "確認離開" }));

    await waitFor(() => {
      expect(screen.getByText(/伺服器暫時無法處理/)).toBeInTheDocument();
    });
  });
});
