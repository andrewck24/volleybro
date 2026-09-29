import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import TeamForm, {
  EditTeamWorkspace,
  NewTeamWorkspace,
} from "@/components/team/form";
import { SwrIsolation } from "@/test-utils/swr-isolation";
import { server } from "../../../../test/msw/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

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
  it("renders loading skeleton while team data is loading", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get("/api/teams/team-123", async () => {
        await gate;
        return HttpResponse.json({ id: "team-123", name: "Test Team" });
      }),
    );

    render(
      <SwrIsolation>
        <EditTeamWorkspace teamId="team-123" />
      </SwrIsolation>,
    );
    expect(
      screen.queryByPlaceholderText("日本國家男子排球隊"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    release();
    expect(
      await screen.findByPlaceholderText("日本國家男子排球隊"),
    ).toBeInTheDocument();
  });

  it("renders team form when team data is loaded", async () => {
    server.use(
      http.get("/api/teams/team-123", () =>
        HttpResponse.json({
          id: "team-123",
          name: "Test Team",
          nickname: "TT",
        }),
      ),
    );

    render(
      <SwrIsolation>
        <EditTeamWorkspace teamId="team-123" />
      </SwrIsolation>,
    );

    expect(await screen.findByDisplayValue("Test Team")).toBeInTheDocument();
  });

  it("renders not-found alert with 返回 when the team does not exist", async () => {
    server.use(
      http.get("/api/teams/team-123", () =>
        HttpResponse.json(
          { code: "NOT_FOUND", reason: "RESOURCE_NOT_FOUND" },
          { status: 404 },
        ),
      ),
    );

    render(
      <SwrIsolation>
        <EditTeamWorkspace teamId="team-123" />
      </SwrIsolation>,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
  });
});

describe("NewTeamWorkspace", () => {
  it("renders the team creation form", () => {
    render(<NewTeamWorkspace />);
    expect(
      screen.getByPlaceholderText("日本國家男子排球隊"),
    ).toBeInTheDocument();
  });
});
