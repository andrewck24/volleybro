import { EditForm } from "@/components/team/players/edit-form";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();
const mockGlobalMutate = jest.fn();
const mockApiClient = jest.fn();
const mockPlayerMutate = jest.fn();

jest.mock("@/lib/api/api-client", () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
  ApiClientError: class ApiClientError extends Error {
    info: unknown;
    constructor(message: string, info: unknown) {
      super(message);
      this.name = "ApiClientError";
      this.info = info;
    }
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: mockGlobalMutate }),
}));

jest.mock("@/hooks/use-leave-page-warning", () => ({
  useLeavePageWarning: jest.fn(),
  suppressLeaveWarning: jest.fn(),
}));

const TEAM_ID = "507f1f77bcf86cd799439011";
const PLAYER_ID = "507f1f77bcf86cd799439012";

const player = {
  id: PLAYER_ID,
  name: "Alice",
  teamId: TEAM_ID,
  role: PlayerRole.MEMBER,
  status: PlayerStatus.JOINED,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

jest.mock("@/hooks/use-data", () => ({
  usePlayer: () => ({
    player,
    isLoading: false,
    error: undefined,
    mutate: mockPlayerMutate,
  }),
  useTeamPlayers: () => ({ players: [player] }),
  useUser: () => ({ user: { id: "someone-else" } }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

async function setup(onSuccess?: () => void) {
  render(
    <EditForm teamId={TEAM_ID} playerId={PLAYER_ID} onSuccess={onSuccess} />,
  );
  const nameField = await screen.findByDisplayValue("Alice");
  await userEvent.clear(nameField);
  await userEvent.type(nameField, "Alicia");
  await userEvent.click(screen.getByRole("button", { name: /儲存變更/ }));
}

describe("EditForm", () => {
  it("calls onSuccess and does not push when onSuccess is provided", async () => {
    mockApiClient.mockResolvedValue({ ...player, name: "Alicia" });
    const onSuccess = jest.fn();

    await setup(onSuccess);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("pushes to the team page when onSuccess is not provided", async () => {
    mockApiClient.mockResolvedValue({ ...player, name: "Alicia" });

    await setup();

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(`/team/${TEAM_ID}`),
    );
  });
});
