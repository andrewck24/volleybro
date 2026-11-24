import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { createTeam } from "@test/support/fixtures/entities";
import { deferred } from "@test/support/gates";
import { server } from "@test/support/msw/server";
import { answerTeamRequests } from "@test/support/msw/team-handlers";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { seedActiveTeamPreference } from "@test/support/storage/active-team-preference";
import TeamEntryPage from "../page";

const mockReplace = jest.fn();
let mockPathname: string;
const guide = "歡迎使用 VolleyBro !";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace }),
}));

beforeEach(() => {
  localStorage.clear();
  mockReplace.mockClear();
  mockPathname = "/team";
});

const renderEntry = () => render(<TeamEntryPage />, { wrapper: SwrIsolation });

it("replaces the entry with the resolved team", async () => {
  answerTeamRequests({ teams: [createTeam({ id: "team-1" })] });
  renderEntry();

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/team/team-1"));
  expect(screen.queryByText(guide)).not.toBeInTheDocument();
});

it("shows a skeleton while memberships are still resolving", async () => {
  const players = deferred();
  const { arrived } = answerTeamRequests({
    gates: { players: players.promise },
  });
  renderEntry();

  await waitFor(() => expect(arrived).toContain("/api/users/user-1/players"));
  expect(screen.getByRole("status", { name: "載入球隊中" })).toBeVisible();
  expect(screen.queryByText(guide)).not.toBeInTheDocument();
});

it("shows the guide only after a successful empty membership response", async () => {
  const players = deferred();
  answerTeamRequests({
    joinedTeamIds: [],
    gates: { players: players.promise },
  });
  renderEntry();

  expect(screen.queryByText(guide)).not.toBeInTheDocument();
  players.release();
  expect(await screen.findByText(guide)).toBeVisible();
  expect(mockReplace).not.toHaveBeenCalled();
});

it.each(["/api/users", "/api/users/:userId/players"])(
  "shows retry when %s fails and redirects after recovery",
  async (endpoint) => {
    answerTeamRequests({ teams: [createTeam({ id: "team-1" })] });
    server.use(http.get(endpoint, () => HttpResponse.error(), { once: true }));
    renderEntry();

    const retry = await screen.findByRole("button", { name: "再試一次" });
    expect(screen.queryByText(guide)).not.toBeInTheDocument();
    await userEvent.click(retry);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/team/team-1"),
    );
  },
);

it("lets the user retry a failed preferred team request when no joined team resolves", async () => {
  seedActiveTeamPreference("user-1", "team-1");
  answerTeamRequests({
    teams: [createTeam({ id: "team-1" })],
    joinedTeamIds: [],
  });
  server.use(
    http.get("/api/teams/team-1", () => HttpResponse.error(), { once: true }),
  );
  renderEntry();

  const retry = await screen.findByRole("button", { name: "再試一次" });
  expect(screen.queryByText(guide)).not.toBeInTheDocument();
  await userEvent.click(retry);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/team/team-1"));
});

it("does not redirect from a retained team slot on another tab", async () => {
  mockPathname = "/home";
  const { answered } = answerTeamRequests({
    teams: [createTeam({ id: "team-1" })],
  });
  const { rerender } = renderEntry();

  await waitFor(() => expect(answered).toContain("/api/teams/team-1"));
  expect(mockReplace).not.toHaveBeenCalled();
  mockPathname = "/team";
  rerender(<TeamEntryPage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/team/team-1"));
});
