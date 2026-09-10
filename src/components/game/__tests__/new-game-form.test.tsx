import { ActionButton } from "@/components/layout/nav/action-button";
import { apiClient } from "@/lib/api/api-client";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRouterPush = jest.fn();
const mockToast = jest.fn();
const mockMutate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: mockMutate }),
}));

const mockTeam = {
  name: "測試隊伍",
  lineups: [{ starting: [], liberos: [], substitutes: [] }],
};

jest.mock("@/hooks/use-data", () => ({
  useTeam: () => ({ team: mockTeam, isLoading: false }),
  useTeamPlayers: () => ({ players: [], isLoading: false }),
}));

jest.mock("@/lib/api/api-client", () => ({
  apiClient: jest.fn(),
}));

jest.mock("@/lib/api/error-toast", () => ({
  showErrorToast: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockApiClient = apiClient as jest.Mock;

describe("ActionButton / NewGameForm creation failure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the dialog open and the match info filled after a failed creation", async () => {
    mockApiClient.mockRejectedValue(new Error("network error"));

    const user = userEvent.setup();
    render(<ActionButton teamId="team-1" />);

    await user.click(screen.getByRole("button", { name: "新增賽事" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("測試隊伍")).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /創建賽事紀錄/ }),
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByText("測試隊伍"),
    ).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
