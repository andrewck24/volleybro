import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Toaster } from "@/components/ui/toaster";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import TeamForm, {
  EditTeamWorkspace,
  NewTeamWorkspace,
} from "@/components/team/form";
import { deferred } from "@test/support/gates";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { server } from "@test/support/msw/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

const onSubmit = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe("TeamForm", () => {
  it("shows a failed submit once, in the form, and raises no toast", async () => {
    onSubmit.mockRejectedValue(new Error("boom"));
    render(
      <>
        <TeamForm
          draftKey="draft:team:fail"
          defaultValues={{ name: "Team", nickname: "T" }}
          onSubmit={onSubmit}
        />
        <Toaster />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: /儲存修改/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ERROR_MESSAGES.UNKNOWN.title);
    expect(alert).toHaveTextContent(ERROR_MESSAGES.UNKNOWN.description);
    expect(
      screen.getAllByText(ERROR_MESSAGES.UNKNOWN.description),
    ).toHaveLength(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("loads defaults that arrive after mount", async () => {
    const { rerender } = render(
      <TeamForm draftKey="draft:team:abc" onSubmit={onSubmit} />,
    );
    const nameInput = screen.getByPlaceholderText("日本國家男子排球隊");
    expect((nameInput as HTMLInputElement).value).toBe("");

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
    const user = userEvent.setup();
    const { rerender } = render(
      <TeamForm
        draftKey="draft:team:def"
        defaultValues={{ name: "Old Name", nickname: "" }}
        onSubmit={onSubmit}
      />,
    );
    const nameInput = screen.getByPlaceholderText("日本國家男子排球隊");
    await user.clear(nameInput);
    await user.type(nameInput, "My edited team");

    rerender(
      <TeamForm
        draftKey="draft:team:def"
        defaultValues={{ name: "New Server Name", nickname: "" }}
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() => expect(nameInput).toHaveValue("My edited team"));
  });
});

describe("EditTeamWorkspace", () => {
  it("renders loading skeleton while team data is loading", async () => {
    const { promise, release } = deferred();
    server.use(
      http.get("/api/teams/team-123", async () => {
        await promise;
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
