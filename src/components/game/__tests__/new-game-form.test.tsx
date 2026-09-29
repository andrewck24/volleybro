import { ActionButton } from "@/components/layout/nav/action-button";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";

import { server } from "@test/support/msw/server";

const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const emptyLineup = {
  options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
  starting: [],
  liberos: [],
  substitutes: [],
};
const secondLineup = { ...emptyLineup, substitutes: [{ id: "p1" }] };
const team = {
  id: "team-1",
  name: "測試隊伍",
  lineups: [emptyLineup, secondLineup],
};

describe("ActionButton / NewGameForm creation failure", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it("keeps the dialog open and the match info filled after a failed creation", async () => {
    let createBody: unknown;
    server.use(
      http.get("/api/teams/team-1/players", () =>
        HttpResponse.json([
          { id: "p1", name: "選手一", number: 4, status: "Joined" },
        ]),
      ),
      http.post("/api/games", async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json(
          { code: "UNEXPECTED", reason: "UNEXPECTED" },
          { status: 500 },
        );
      }),
    );

    const user = userEvent.setup();
    render(
      // The form seeds the home team name from the team when it mounts, so the
      // team is already cached, as it is once the page has loaded it.
      <SWRConfig
        value={{
          provider: () =>
            new Map([["/api/teams/team-1", { data: team }]]) as never,
          dedupingInterval: 0,
        }}
      >
        <ActionButton teamId="team-1" />
      </SWRConfig>,
    );

    await user.click(screen.getByRole("button", { name: "新增賽事" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("測試隊伍")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "2" }));
    expect(within(dialog).getByText("陣容配置 2")).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /創建賽事紀錄/ }),
    );

    await waitFor(() =>
      expect(createBody).toMatchObject({
        teams: {
          home: {
            id: "team-1",
            lineup: secondLineup,
            players: [{ id: "p1", name: "選手一", number: 4 }],
          },
        },
      }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: /創建賽事紀錄/,
        }),
      ).toBeEnabled(),
    );

    expect(
      within(screen.getByRole("dialog")).getByText("陣容配置 2"),
    ).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
