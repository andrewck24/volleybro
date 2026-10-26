import TeamHero from "@/components/team/hero";
import { render, screen } from "@testing-library/react";

import { createTeam } from "@test/support/fixtures/entities";
import { answerTeamRequests } from "@test/support/msw/team-handlers";
import { SwrIsolation } from "@test/support/react/swr-isolation";

// Production smoke finds the team by this heading: production builds strip data-testid.
test("the loaded team name is the page heading", async () => {
  const team = createTeam({ name: "Smoke Test" });
  answerTeamRequests({ teams: [team] });

  render(
    <SwrIsolation>
      <TeamHero teamId={team.id} />
    </SwrIsolation>,
  );

  expect(
    await screen.findByRole("heading", { level: 1, name: "Smoke Test" }),
  ).toBeInTheDocument();
});
