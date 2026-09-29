import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@test/support/msw/server";
import EditTeamModalPage from "../page";

const mockTeamId = "507f1f77bcf86cd799439011";
const mockBack = jest.fn();

// use(props.params) suspends in jsdom — return the params synchronously instead.
jest.mock("react", () => ({
  ...jest.requireActual<typeof import("react")>("react"),
  use: () => ({ teamId: mockTeamId }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

const team = { id: mockTeamId, name: "Test Team", nickname: "TT" };

beforeEach(() => {
  mockBack.mockClear();
  sessionStorage.clear();
});

async function setup() {
  render(
    <SwrIsolation>
      <EditTeamModalPage params={Promise.resolve({ teamId: mockTeamId })} />
    </SwrIsolation>,
  );
  const nameField = await screen.findByPlaceholderText("日本國家男子排球隊");
  await waitFor(() => expect(nameField).toHaveValue(team.name));
  return nameField;
}

async function rename(nameField: HTMLElement, name: string) {
  await userEvent.clear(nameField);
  await userEvent.type(nameField, name);
  await userEvent.click(screen.getByRole("button", { name: /儲存修改/i }));
}

describe("EditTeamModalPage", () => {
  it("shows a root error and stays open when the save fails", async () => {
    server.use(
      http.get(`/api/teams/${mockTeamId}`, () => HttpResponse.json(team)),
      http.patch(`/api/teams/${mockTeamId}`, () =>
        HttpResponse.json(
          { code: "UNEXPECTED", reason: "UNHANDLED_ERROR" },
          { status: 500 },
        ),
      ),
    );
    const nameField = await setup();

    await rename(nameField, "New Name");

    expect(
      await screen.findByText("伺服器暫時無法處理你的請求，請稍後再試一次"),
    ).toBeInTheDocument();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("sends the edited team, refetches it and closes on success", async () => {
    let patchBody: unknown;
    let teamFetches = 0;
    server.use(
      http.get(`/api/teams/${mockTeamId}`, () => {
        teamFetches += 1;
        return HttpResponse.json(team);
      }),
      http.patch(`/api/teams/${mockTeamId}`, async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ ...team, name: "New Name" });
      }),
    );
    const nameField = await setup();

    await rename(nameField, "New Name");

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(patchBody).toEqual({ name: "New Name", nickname: "TT" });
    await waitFor(() => expect(teamFetches).toBe(2));
  });
});
