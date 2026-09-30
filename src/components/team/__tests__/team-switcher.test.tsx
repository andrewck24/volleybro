import { TeamSwitcher } from "@/components/team/team-switcher";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { createTeam } from "@test/support/fixtures/entities";
import { answerTeamRequests } from "@test/support/msw/team-handlers";
import { server } from "@test/support/msw/server";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import {
  seedActiveTeamPreference,
  storedActiveTeamPreference,
  storedPreferenceOf,
} from "@test/support/storage/active-team-preference";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

describe("TeamSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
  });

  it("S6: switching stores the chosen team as the preference and writes nothing to the server profile", async () => {
    seedActiveTeamPreference("user-1", "team-1");
    answerTeamRequests({
      teams: [
        createTeam({ id: "team-1", name: "甲隊" }),
        createTeam({ id: "team-2", name: "乙隊" }),
      ],
    });
    const profileWrites: string[] = [];
    server.use(
      http.patch("/api/profiles", ({ request }) => {
        profileWrites.push(request.url);
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    render(
      <SwrIsolation>
        <TeamSwitcher teamId="team-1" />
      </SwrIsolation>,
    );

    await user.click(await screen.findByRole("button", { name: /甲隊/ }));
    await user.click(await screen.findByRole("button", { name: /乙隊/ }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/team/team-2"),
    );
    expect(storedActiveTeamPreference()).toEqual(
      storedPreferenceOf("user-1", "team-2"),
    );
    expect(profileWrites).toEqual([]);
  });
});
