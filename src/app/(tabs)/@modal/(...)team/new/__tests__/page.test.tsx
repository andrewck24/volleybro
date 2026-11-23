import { ActionButton } from "@/components/layout/nav/action-button";
import { TeamSwitcher } from "@/components/team/team-switcher";
import { useActiveTeamId, useTeam } from "@/hooks/use-data";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { createTeam, createUser } from "@test/support/fixtures/entities";
import { answerTeamRequests } from "@test/support/msw/team-handlers";
import { server } from "@test/support/msw/server";
import NewTeamModalPage from "../page";

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const TeamName = () => {
  const { team } = useTeam(VALID_OBJECT_ID);
  return <p>{team?.name}</p>;
};

const Tree = ({ showTeam = false }: { showTeam?: boolean }) => (
  <SwrIsolation>
    <NewTeamModalPage />
    {showTeam && <TeamName />}
  </SwrIsolation>
);

const OTHER_TEAM_ID = "507f1f77bcf86cd799439012";

const Workspace = () => {
  const { teamId } = useActiveTeamId();
  return (
    <>
      <TeamSwitcher teamId={teamId ?? ""} />
      <ActionButton teamId={teamId} />
    </>
  );
};

const createTeamFrom = async (joinedTeamIds: string[]) => {
  const { answered } = answerTeamRequests({
    user: createUser({ id: "user-1" }),
    teams: [
      createTeam({ id: OTHER_TEAM_ID, name: "Old Team" }),
      createTeam({ id: VALID_OBJECT_ID, name: "My Team" }),
    ],
    joinedTeamIds,
  });
  server.use(
    http.post("/api/teams", () => {
      joinedTeamIds.push(VALID_OBJECT_ID);
      return HttpResponse.json(
        createTeam({ id: VALID_OBJECT_ID, name: "My Team" }),
      );
    }),
  );
  const cache = new Map();
  const { rerender } = render(
    <SwrIsolation cache={cache}>
      <NewTeamModalPage />
      <Workspace />
    </SwrIsolation>,
  );
  await waitFor(() => expect(answered).toContain("/api/users/user-1/players"));
  await fillAndSubmit();
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  rerender(
    <SwrIsolation cache={cache}>
      <Workspace />
    </SwrIsolation>,
  );
};

beforeEach(() => {
  answerTeamRequests();
  mockReplace.mockClear();
  sessionStorage.clear();
  localStorage.clear();
});

async function fillAndSubmit() {
  const nameField = await screen.findByPlaceholderText("日本國家男子排球隊");
  await userEvent.type(nameField, "My Team");
  await userEvent.click(screen.getByRole("button", { name: /建立隊伍/i }));
}

describe("NewTeamModalPage", () => {
  it("shows a root error and stays open when creation fails", async () => {
    server.use(
      http.post("/api/teams", () =>
        HttpResponse.json(
          { code: "UNEXPECTED", reason: "UNHANDLED_ERROR" },
          { status: 500 },
        ),
      ),
    );
    render(<Tree />);

    await fillAndSubmit();

    expect(
      await screen.findByText("伺服器暫時無法處理你的請求，請稍後再試一次"),
    ).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("creates the team, opens its page and has the team ready without refetching", async () => {
    let postBody: unknown;
    server.use(
      http.post("/api/teams", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({
          id: VALID_OBJECT_ID,
          name: "My Team",
          nickname: "",
        });
      }),
    );
    const { rerender } = render(<Tree />);

    await fillAndSubmit();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        `/team/${VALID_OBJECT_ID}?tab=about`,
      ),
    );
    expect(postBody).toEqual({ name: "My Team", nickname: "" });

    rerender(<Tree showTeam />);
    expect(screen.getByText("My Team")).toBeInTheDocument();
  });

  it("lets a new account start a game with its first team without opening the team page", async () => {
    await createTeamFrom([]);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "新增賽事" })).toBeEnabled(),
    );
  });

  it("makes the created team the active one and lists it beside the user's other teams", async () => {
    await createTeamFrom([OTHER_TEAM_ID]);

    await userEvent.click(
      await screen.findByRole("button", { name: /My Team/ }),
    );
    const switcher = await screen.findByRole("dialog", { name: "切換球隊" });
    expect(await within(switcher).findByText("Old Team")).toBeInTheDocument();
    expect(await within(switcher).findByText("My Team")).toBeInTheDocument();
  });
});
