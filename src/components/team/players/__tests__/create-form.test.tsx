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

async function setup({ email }: { email?: string } = {}) {
  render(<CreateForm teamId={TEAM_ID} />);
  const nameField = await screen.findByPlaceholderText("輸入姓名");
  await userEvent.type(nameField, "New Player");
  if (email) {
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      email,
    );
  }
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

  it("offers the role field only once an email makes it an invitation", async () => {
    render(<CreateForm teamId={TEAM_ID} />);

    await screen.findByPlaceholderText("輸入姓名");
    expect(screen.queryByText("角色")).not.toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "invitee@example.com",
    );

    expect(await screen.findByText("角色")).toBeInTheDocument();
  });

  it("submits no role when no email was filled in", async () => {
    mockApiClient.mockResolvedValue({ id: "player-1" });

    await setup();

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());
    const body = JSON.parse(
      (mockApiClient.mock.calls[0]![1] as { body: string }).body,
    ) as Record<string, unknown>;
    expect(body).not.toHaveProperty("role");
  });

  it("submits no role when the email is cleared again", async () => {
    mockApiClient.mockResolvedValue({ id: "player-1" });
    render(<CreateForm teamId={TEAM_ID} />);

    const nameField = await screen.findByPlaceholderText("輸入姓名");
    await userEvent.type(nameField, "New Player");
    const emailField = screen.getByPlaceholderText("user@example.com");
    await userEvent.type(emailField, "invitee@example.com");
    await screen.findByText("角色");
    await userEvent.clear(emailField);
    expect(screen.queryByText("角色")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /新增球員/ }));

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());
    const body = JSON.parse(
      (mockApiClient.mock.calls[0]![1] as { body: string }).body,
    ) as Record<string, unknown>;
    expect(body).not.toHaveProperty("role");
  });
});
