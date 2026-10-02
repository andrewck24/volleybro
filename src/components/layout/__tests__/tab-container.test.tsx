import { TabContainer } from "@/components/layout/tab-container";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createProfile, createTeam } from "@test/support/fixtures/entities";
import { answerTeamRequests } from "@test/support/msw/team-handlers";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import {
  seedActiveTeamPreference,
  storedActiveTeamPreference,
} from "@test/support/storage/active-team-preference";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/home",
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

describe("TabContainer team tab root", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
  });

  it("S3: opens the team the full resolution picked after the preferred team was refused", async () => {
    seedActiveTeamPreference("user-1", "team-gone");
    answerTeamRequests({
      profile: createProfile({ activeTeamId: "team-2" }),
      teams: [createTeam({ id: "team-2" })],
    });
    const user = userEvent.setup();
    render(
      <SwrIsolation>
        <TabContainer
          home="home"
          team="team"
          notifications="notifications"
          user="user"
        />
      </SwrIsolation>,
    );
    await waitFor(() =>
      expect(storedActiveTeamPreference()).toMatchObject({ teamId: "team-2" }),
    );

    await user.click(screen.getByRole("button", { name: "球隊" }));

    expect(mockReplace).toHaveBeenCalledWith("/team/team-2", {
      scroll: false,
    });
  });
});
