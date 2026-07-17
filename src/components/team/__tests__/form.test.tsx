import { render, screen, waitFor } from "@testing-library/react";
import TeamForm, {
  EditTeamWorkspace,
  NewTeamWorkspace,
} from "@/components/team/form";

jest.mock("@/hooks/use-leave-page-warning", () => ({
  useLeavePageWarning: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: jest.fn() }),
  default: jest.fn(),
}));
jest.mock("@/hooks/use-data", () => ({ useTeam: jest.fn() }));

import { useTeam } from "@/hooks/use-data";

const onSubmit = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe("TeamForm", () => {
  it("populates form fields from defaultValues when form is empty (async reset)", async () => {
    const { rerender } = render(
      <TeamForm draftKey="draft:team:abc" onSubmit={onSubmit} />,
    );
    // Initially form is empty
    const nameInput = screen.getByPlaceholderText("日本國家男子排球隊");
    expect((nameInput as HTMLInputElement).value).toBe("");

    // Server data arrives → should populate the form
    rerender(
      <TeamForm
        draftKey="draft:team:abc"
        defaultValues={{ name: "Server Team", nickname: "ST" }}
        onSubmit={onSubmit}
      />,
    );
    await waitFor(() => {
      expect((nameInput as HTMLInputElement).value).toBe("Server Team");
    });
  });

  it("does not overwrite user input when form is dirty", async () => {
    const { rerender } = render(
      <TeamForm
        draftKey="draft:team:def"
        defaultValues={{ name: "Old Name", nickname: "" }}
        onSubmit={onSubmit}
      />,
    );

    // Simulate server data arriving again — form already has values, should not reset
    rerender(
      <TeamForm
        draftKey="draft:team:def"
        defaultValues={{ name: "New Server Name", nickname: "" }}
        onSubmit={onSubmit}
      />,
    );

    // Should keep original value (form already has non-empty data from initial render)
    const nameInput = screen.getByPlaceholderText("日本國家男子排球隊");
    expect((nameInput as HTMLInputElement).value).toBe("Old Name");
  });
});

describe("EditTeamWorkspace", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders loading skeleton while team data is loading", () => {
    (useTeam as jest.Mock).mockReturnValue({
      team: undefined,
      isLoading: true,
      error: undefined,
      mutate: jest.fn(),
    });
    render(<EditTeamWorkspace teamId="team-123" />);
    expect(
      screen.queryByPlaceholderText("日本國家男子排球隊"),
    ).not.toBeInTheDocument();
  });

  it("renders team form when team data is loaded", () => {
    (useTeam as jest.Mock).mockReturnValue({
      team: { name: "Test Team", nickname: "TT" },
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });
    render(<EditTeamWorkspace teamId="team-123" />);
    expect(
      screen.getByPlaceholderText("日本國家男子排球隊"),
    ).toBeInTheDocument();
  });

  it("renders not-found alert with 返回 when team is null and not loading", () => {
    (useTeam as jest.Mock).mockReturnValue({
      team: undefined,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });
    render(<EditTeamWorkspace teamId="team-123" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
  });
});

describe("NewTeamWorkspace", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the team creation form", () => {
    render(<NewTeamWorkspace />);
    expect(
      screen.getByPlaceholderText("日本國家男子排球隊"),
    ).toBeInTheDocument();
  });
});
