import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewTeamModalPage from "../page";

const mockPush = jest.fn();
const mockMutate = jest.fn();
const mockApiClient = jest.fn();

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
  useSWRConfig: () => ({ mutate: mockMutate }),
}));

jest.mock("@/hooks/use-leave-page-warning", () => ({
  useLeavePageWarning: jest.fn(),
  suppressLeaveWarning: jest.fn(),
}));

jest.mock("@/components/layout/edit-dialog-container", () => ({
  EditDialogContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog">{children}</div>
  ),
}));

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

async function setup() {
  render(<NewTeamModalPage />);
  return screen.findByPlaceholderText("日本國家男子排球隊");
}

describe("NewTeamModalPage", () => {
  it("shows root error when apiClient throws", async () => {
    mockApiClient.mockRejectedValue(new Error("伺服器錯誤"));
    const nameField = await setup();

    await userEvent.type(nameField, "My Team");
    await userEvent.click(screen.getByRole("button", { name: /建立隊伍/i }));

    await waitFor(() => {
      expect(screen.getByText("伺服器錯誤")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to team page and updates SWR cache on success", async () => {
    const newTeam = { id: VALID_OBJECT_ID, name: "My Team", nickname: "" };
    mockApiClient.mockResolvedValue(newTeam);
    const nameField = await setup();

    await userEvent.type(nameField, "My Team");
    await userEvent.click(screen.getByRole("button", { name: /建立隊伍/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        `/api/teams/${VALID_OBJECT_ID}`,
        newTeam,
        false,
      );
      expect(mockPush).toHaveBeenCalledWith(
        `/team/${VALID_OBJECT_ID}?tab=about`,
      );
    });
  });
});
