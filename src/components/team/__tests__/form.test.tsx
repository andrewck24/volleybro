import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import TeamForm, {
  EditTeamWorkspace,
  NewTeamWorkspace,
} from "@/components/team/form";
import { deferred } from "@test/support/gates";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { server } from "@test/support/msw/server";
import { createTeam, createUser } from "@test/support/fixtures/entities";
import {
  storedActiveTeamPreference,
  storedPreferenceOf,
} from "@test/support/storage/active-team-preference";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

const onSubmit = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe("TeamForm", () => {
  it("resets late defaults only while the form is untouched", async () => {
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
    const { rerender } = render(
      <TeamForm
        draftKey="draft:team:def"
        defaultValues={{ name: "Old Name", nickname: "" }}
        onSubmit={onSubmit}
      />,
    );

    rerender(
      <TeamForm
        draftKey="draft:team:def"
        defaultValues={{ name: "New Server Name", nickname: "" }}
        onSubmit={onSubmit}
      />,
    );

    const nameInput = screen.getByPlaceholderText("日本國家男子排球隊");
    expect((nameInput as HTMLInputElement).value).toBe("Old Name");
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
  beforeEach(() => localStorage.clear());

  it("renders the team creation form", () => {
    render(<NewTeamWorkspace />);
    expect(
      screen.getByPlaceholderText("日本國家男子排球隊"),
    ).toBeInTheDocument();
  });

  it("makes the created team this device's active team", async () => {
    server.use(
      http.get("/api/users", () =>
        HttpResponse.json(createUser({ id: "user-1" })),
      ),
      http.post("/api/teams", () =>
        HttpResponse.json(createTeam({ id: "team-new" })),
      ),
    );
    const user = userEvent.setup();
    render(
      <SwrIsolation>
        <NewTeamWorkspace />
      </SwrIsolation>,
    );

    await user.type(
      screen.getByPlaceholderText("日本國家男子排球隊"),
      "New Team",
    );
    await user.click(screen.getByRole("button", { name: "建立隊伍" }));

    await waitFor(() =>
      expect(storedActiveTeamPreference()).toEqual(
        storedPreferenceOf("user-1", "team-new"),
      ),
    );
  });
});
