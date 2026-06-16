import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";

// use(props.params) suspends in jsdom — mock it to return synchronously instead.
jest.mock("react", () => ({
  ...jest.requireActual<typeof import("react")>("react"),
  use: jest.fn().mockReturnValue({ teamId: "507f1f77bcf86cd799439011" }),
}));

const mockBack = jest.fn();
const mockGlobalMutate = jest.fn();
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

jest.mock("@/hooks/use-data", () => ({
  useTeam: jest.fn(() => ({
    team: { id: VALID_OBJECT_ID, name: "Test Team", nickname: "TT" },
    mutate: mockMutate,
  })),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: mockGlobalMutate }),
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

import EditTeamModalPage from "../page";

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  // Restore the use mock since clearAllMocks resets return values.
  (React.use as jest.Mock).mockReturnValue({ teamId: VALID_OBJECT_ID });
});

async function setup() {
  const params = Promise.resolve({ teamId: VALID_OBJECT_ID });
  render(<EditTeamModalPage params={params} />);
  return screen.findByPlaceholderText("日本國家男子排球隊");
}

describe("EditTeamModalPage", () => {
  it("shows root error when apiClient throws", async () => {
    mockApiClient.mockRejectedValue(new Error("驗證失敗"));
    const nameField = await setup();

    await userEvent.clear(nameField);
    await userEvent.type(nameField, "New Name");
    await userEvent.click(screen.getByRole("button", { name: /儲存修改/i }));

    await waitFor(() => {
      expect(screen.getByText("驗證失敗")).toBeInTheDocument();
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("updates SWR cache and calls router.back on success", async () => {
    const updatedTeam = { id: VALID_OBJECT_ID, name: "New Name", nickname: "TT" };
    mockApiClient.mockResolvedValue(updatedTeam);
    const nameField = await setup();

    await userEvent.clear(nameField);
    await userEvent.type(nameField, "New Name");
    await userEvent.click(screen.getByRole("button", { name: /儲存修改/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
      expect(mockGlobalMutate).toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalled();
    });
  });
});
