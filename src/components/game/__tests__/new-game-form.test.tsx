import { ActionButton } from "@/components/layout/nav/action-button";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@test/support/msw/server";
import { SwrIsolation } from "@test/support/react/swr-isolation";

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

beforeEach(() => {
  server.use(http.get("/api/teams/team-1", () => HttpResponse.json(team)));
});

describe("ActionButton / NewGameForm home team name", () => {
  let createBody: { teams: { home: { name: string } } } | undefined;

  beforeEach(() => {
    createBody = undefined;
    server.use(
      http.get("/api/teams/team-1/players", () => HttpResponse.json([])),
      http.post("/api/games", async ({ request }) => {
        createBody = (await request.json()) as typeof createBody;
        return HttpResponse.json({ id: "game-1" });
      }),
    );
  });

  const openDialog = async () => {
    const user = userEvent.setup();
    render(
      <SwrIsolation>
        <ActionButton teamId="team-1" />
      </SwrIsolation>,
    );
    await user.click(screen.getByRole("button", { name: "新增賽事" }));
    const dialog = await screen.findByRole("dialog");
    return { user, dialog };
  };

  it("shows and submits the team name when the team was not cached before the dialog opened", async () => {
    const { user, dialog } = await openDialog();

    await user.click(await within(dialog).findByText("編輯資訊"));
    expect(await within(dialog).findByLabelText("我方名稱")).toHaveValue(
      "測試隊伍",
    );

    await user.click(within(dialog).getByRole("button", { name: "確認" }));
    await user.click(
      within(dialog).getByRole("button", { name: /創建賽事紀錄/ }),
    );
    await waitFor(() => expect(createBody?.teams.home.name).toBe("測試隊伍"));
  });

  it("keeps a home team name the user typed", async () => {
    const { user, dialog } = await openDialog();

    await user.click(await within(dialog).findByText("編輯資訊"));
    const field = await within(dialog).findByLabelText("我方名稱");
    await user.clear(field);
    await user.type(field, "自訂隊名");
    await user.click(within(dialog).getByRole("button", { name: "確認" }));
    await user.click(
      within(dialog).getByRole("button", { name: /創建賽事紀錄/ }),
    );

    await waitFor(() => expect(createBody?.teams.home.name).toBe("自訂隊名"));
  });
});

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
      <SwrIsolation>
        <ActionButton teamId="team-1" />
      </SwrIsolation>,
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
