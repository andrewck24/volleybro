import { PlayerStatus } from "@/entities/player";
import type { Profile } from "@/entities/profile";
import type { Team } from "@/entities/team";
import type { User } from "@/entities/user";
import { http, HttpResponse } from "msw";

import {
  createProfile,
  createTeam,
  createUser,
} from "@test/support/fixtures/entities";
import { server } from "@test/support/msw/server";

type Gate = Promise<void>;

type TeamRequests = {
  user?: User;
  profile?: Profile;
  /** The teams the server answers for; it refuses any other id as a non-member request. */
  teams?: Team[];
  /** The ids of `teams` the user has joined; all of them by default. */
  joinedTeamIds?: string[];
  gates?: {
    user?: Gate;
    profile?: Gate;
    players?: Gate;
    team?: Gate;
    teamPlayers?: Gate;
  };
};

/**
 * Answers the requests the active team depends on, and returns the paths in
 * the order they arrived and those that have been answered.
 */
export const answerTeamRequests = ({
  user = createUser(),
  profile = createProfile(),
  teams = [createTeam()],
  joinedTeamIds = teams.map((team) => team.id),
  gates = {},
}: TeamRequests = {}) => {
  const arrived: string[] = [];
  const answered: string[] = [];
  const respond = async (
    request: Request,
    gate: Gate | undefined,
    body: () => Response,
  ) => {
    const { pathname, search } = new URL(request.url);
    arrived.push(pathname + search);
    await gate;
    answered.push(pathname + search);
    return body();
  };

  server.use(
    http.get("/api/users", ({ request }) =>
      respond(request, gates.user, () => HttpResponse.json(user)),
    ),
    http.get("/api/profiles", ({ request }) =>
      respond(request, gates.profile, () => HttpResponse.json(profile)),
    ),
    http.get("/api/users/:userId/players", ({ request }) =>
      respond(request, gates.players, () =>
        HttpResponse.json(
          joinedTeamIds.map((teamId, i) => ({
            id: `player-${i}`,
            teamId,
            status: PlayerStatus.JOINED,
          })),
        ),
      ),
    ),
    http.get("/api/teams/:teamId", ({ request, params }) =>
      respond(request, gates.team, () => {
        const team = teams.find((t) => t.id === params.teamId);
        return !team
          ? HttpResponse.json(
              { code: "AUTHORIZATION", reason: "NOT_A_MEMBER" },
              { status: 403 },
            )
          : HttpResponse.json(team);
      }),
    ),
    http.get("/api/games", ({ request }) =>
      respond(request, undefined, () =>
        HttpResponse.json({ gameSummaries: [], hasMore: false, lastId: "" }),
      ),
    ),
    http.get("/api/teams/:teamId/players", ({ request }) =>
      respond(request, gates.teamPlayers, () => HttpResponse.json([])),
    ),
  );

  return { arrived, answered };
};
