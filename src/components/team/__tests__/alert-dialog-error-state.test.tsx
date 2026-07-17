import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MembershipSection } from "@/components/team/players/membership-section";
import { createPlayer } from "@/__tests__/helpers";
import { ApiClientError } from "@/lib/api/api-client";
import { type AppErrorCode } from "@/entities/errors";

// Mock apiClient
const mockApiClient = jest.fn();
jest.mock("@/lib/api/api-client", () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
  ApiClientError: jest.requireActual("@/lib/api/api-client").ApiClientError,
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = { push: mockPush, back: jest.fn(), refresh: jest.fn() };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock SWR
const mockMutate = jest.fn();
jest.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: mockMutate }),
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock showErrorToast so we can verify it's NOT called for AlertDialog flows
const mockShowErrorToast = jest.fn();
jest.mock("@/lib/api/error-toast", () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
  getErrorMessage: jest.requireActual("@/lib/api/error-toast").getErrorMessage,
}));

// Mock RoleSelect
jest.mock("@/components/team/role-select", () => ({
  RoleSelect: ({
    value,
    onChange,
    disabled,
  }: {
    value?: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="role-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="member">member</option>
      <option value="admin">admin</option>
    </select>
  ),
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
    detail,
    status,
  });
}

const joinedPlayer = createPlayer({
  number: 7,
  email: "test@example.com",
});

describe("AlertDialog error state — MembershipSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleRemove — dialog stays open on error", () => {
    it("should show inline error message when remove fails", async () => {
      const user = userEvent.setup();
      mockApiClient.mockRejectedValueOnce(
        createApiError(
          403,
          "AUTHORIZATION",
          "NOT_TEAM_OWNER",
          "Only the team owner can remove members",
        ),
      );

      render(
        <MembershipSection
          player={joinedPlayer}
          teamId="team-1"
          isCurrentOwner={true}
        />,
      );

      // Open the remove dialog
      await user.click(screen.getByRole("button", { name: "移除成員" }));

      // Confirm remove
      await user.click(screen.getByRole("button", { name: "確認移除" }));

      // Error message should appear inline in dialog
      await waitFor(() => {
        expect(
          screen.getByText("Only the team owner can remove members"),
        ).toBeInTheDocument();
      });

      // Dialog should still be visible (title still present)
      expect(
        screen.getByText(/確定要將.*從隊伍中移除嗎？/),
      ).toBeInTheDocument();

      // showErrorToast should NOT be called — error is inline
      expect(mockShowErrorToast).not.toHaveBeenCalled();
    });

    it("should clear error and close dialog on successful retry", async () => {
      const user = userEvent.setup();

      // First call fails
      mockApiClient.mockRejectedValueOnce(
        createApiError(
          500,
          "UNEXPECTED",
          "UNHANDLED_ERROR",
          "An unexpected error occurred",
        ),
      );

      render(
        <MembershipSection
          player={joinedPlayer}
          teamId="team-1"
          isCurrentOwner={true}
        />,
      );

      await user.click(screen.getByRole("button", { name: "移除成員" }));
      await user.click(screen.getByRole("button", { name: "確認移除" }));

      await waitFor(() => {
        expect(screen.getByText(/伺服器暫時無法處理/)).toBeInTheDocument();
      });

      // Second call succeeds
      mockApiClient.mockResolvedValueOnce({});

      await user.click(screen.getByRole("button", { name: "確認移除" }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "成員已移除" }),
        );
      });
    });
  });

  describe("handleTransferOwnership — dialog stays open on error", () => {
    it("should show inline error message when transfer fails", async () => {
      const user = userEvent.setup();
      mockApiClient.mockRejectedValueOnce(
        createApiError(
          403,
          "AUTHORIZATION",
          "NOT_TEAM_OWNER",
          "Only the current team owner can transfer ownership",
        ),
      );

      render(
        <MembershipSection
          player={joinedPlayer}
          teamId="team-1"
          isCurrentOwner={true}
        />,
      );

      // Open the transfer dialog
      await user.click(
        screen.getByRole("button", { name: "移轉所有權給此球員" }),
      );

      // Confirm transfer
      await user.click(screen.getByRole("button", { name: "確認移轉" }));

      // Error message should appear inline in dialog
      await waitFor(() => {
        expect(
          screen.getByText(
            "Only the current team owner can transfer ownership",
          ),
        ).toBeInTheDocument();
      });

      // Dialog should still be visible
      expect(screen.getByText(/確定要將隊伍所有權移轉給/)).toBeInTheDocument();

      expect(mockShowErrorToast).not.toHaveBeenCalled();
    });
  });
});
