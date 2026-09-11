import { CreateForm } from "@/components/team/players/create-form";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGlobalMutate = jest.fn();
const mockApiClient = jest.fn();

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: (...args: unknown[]) => mockApiClient(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: mockGlobalMutate }),
}));

jest.mock("@/hooks/use-leave-page-warning", () => ({
  useLeavePageWarning: jest.fn(),
  suppressLeaveWarning: jest.fn(),
}));

const TEAM_ID = "507f1f77bcf86cd799439011";

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

async function setup() {
  render(<CreateForm teamId={TEAM_ID} />);
  const nameField = await screen.findByPlaceholderText("輸入姓名");
  await userEvent.type(nameField, "New Player");
  await userEvent.click(screen.getByRole("button", { name: /新增球員/ }));
}

describe("CreateForm", () => {
  it("replaces with the new player's page on success", async () => {
    mockApiClient.mockResolvedValue({ id: "player-1" });

    await setup();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        `/team/${TEAM_ID}/players/player-1`,
      ),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
