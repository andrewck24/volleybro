import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvitationList } from "@/components/team/invitation-list";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { ApiClientError } from "@/lib/api/api-client";

// Mock useToast
const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock("@/lib/api/error-toast", () => ({
  showErrorToast: jest.fn(),
  getErrorMessage: jest.requireActual("@/lib/api/error-toast").getErrorMessage,
}));

function createApiError(
  status: number,
  code: string,
  reason: string,
  detail: string
) {
  return new ApiClientError(detail, {
    code: code as any,
    reason,
    detail,
    status,
  });
}

const pendingInvitation = {
  _id: "player-1",
  name: "Team A",
  number: 0,
  position: "",
  status: PlayerStatus.INVITED,
  teamId: "team-1",
  role: PlayerRole.MEMBER,
  email: "user@example.com",
  userId: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("InvitationList — inline error feedback on accept failure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show inline error on the invitation item when accept fails", async () => {
    const user = userEvent.setup();
    const mockOnAccept = jest.fn().mockRejectedValueOnce(
      createApiError(409, "CONFLICT", "ALREADY_JOINED", "Already a team member")
    );
    const mockOnReject = jest.fn();

    render(
      <InvitationList
        invitations={[pendingInvitation]}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    await user.click(screen.getByRole("button", { name: "接受" }));

    await waitFor(() => {
      expect(screen.getByText("Already a team member")).toBeInTheDocument();
    });
  });

  it("should show branded message for server errors on accept", async () => {
    const user = userEvent.setup();
    const mockOnAccept = jest.fn().mockRejectedValueOnce(
      createApiError(500, "UNEXPECTED", "UNHANDLED_ERROR", "An unexpected error occurred")
    );
    const mockOnReject = jest.fn();

    render(
      <InvitationList
        invitations={[pendingInvitation]}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    await user.click(screen.getByRole("button", { name: "接受" }));

    await waitFor(() => {
      expect(screen.getByText(/伺服器暫時無法處理/)).toBeInTheDocument();
    });
  });

  it("should clear error when accept succeeds on retry", async () => {
    const user = userEvent.setup();
    const mockOnAccept = jest
      .fn()
      .mockRejectedValueOnce(
        createApiError(409, "CONFLICT", "ALREADY_JOINED", "Already a team member")
      )
      .mockResolvedValueOnce(undefined);
    const mockOnReject = jest.fn();

    render(
      <InvitationList
        invitations={[pendingInvitation]}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    await user.click(screen.getByRole("button", { name: "接受" }));

    await waitFor(() => {
      expect(screen.getByText("Already a team member")).toBeInTheDocument();
    });

    // Retry
    await user.click(screen.getByRole("button", { name: "接受" }));

    await waitFor(() => {
      expect(screen.queryByText("Already a team member")).not.toBeInTheDocument();
    });
  });
});
