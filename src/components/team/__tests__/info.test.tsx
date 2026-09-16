import TeamInfo from "@/components/team/info";
import { ApiClientError } from "@/lib/api/api-client";
import { render, screen } from "@testing-library/react";

const mockUseTeam = jest.fn();
const mockUseTeamPlayers = jest.fn();

jest.mock("@/hooks/use-data", () => ({
  useTeam: (...args: unknown[]) => mockUseTeam(...args),
  useTeamPlayers: (...args: unknown[]) => mockUseTeamPlayers(...args),
  useUser: () => ({ user: { id: "user-1" }, isLoading: false }),
}));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const forbiddenError = new ApiClientError("Forbidden", {
  code: "AUTHORIZATION",
  reason: "NOT_TEAM_MEMBER",
  status: 403,
});

describe("TeamInfo", () => {
  it("shows the error state instead of throwing when the team fails to load with 403", () => {
    mockUseTeam.mockReturnValue({
      team: undefined,
      isLoading: false,
      error: forbiddenError,
      mutate: jest.fn(),
    });
    mockUseTeamPlayers.mockReturnValue({
      players: undefined,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });

    expect(() => render(<TeamInfo teamId="team-1" />)).not.toThrow();
    expect(screen.getByText("哎呀，發球掛網！")).toBeInTheDocument();
  });
});
