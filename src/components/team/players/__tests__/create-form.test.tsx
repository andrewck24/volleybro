import { CreateForm } from "@/components/team/players/create-form";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();
const mockGlobalMutate = jest.fn();
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

async function setup(onSuccess?: () => void) {
  render(<CreateForm teamId={TEAM_ID} onSuccess={onSuccess} />);
  const nameField = await screen.findByPlaceholderText("輸入姓名");
  await userEvent.type(nameField, "New Player");
  await userEvent.click(screen.getByRole("button", { name: /新增球員/ }));
}

describe("CreateForm", () => {
  it("calls onSuccess and does not push when onSuccess is provided", async () => {
    mockApiClient.mockResolvedValue({ id: "player-1" });
    const onSuccess = jest.fn();

    await setup(onSuccess);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("pushes to the team page when onSuccess is not provided", async () => {
    mockApiClient.mockResolvedValue({ id: "player-1" });

    await setup();

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(`/team/${TEAM_ID}`),
    );
  });
});
