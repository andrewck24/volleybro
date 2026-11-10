import {
  routeRequest,
  silenceConsoleError,
} from "@test/support/http/route-request";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { AuthorizationError, AuthReason } from "@/entities/errors";
import { createTeamVariants, updateTeamStyleVariants } from "../team-variants";

const createController = jest.fn<(input: unknown) => Promise<unknown>>();
const updateController =
  jest.fn<(id: string, input: unknown) => Promise<unknown>>();
const getSession = jest.fn<() => Promise<unknown>>();
const verifyAdmin =
  jest.fn<(teamId: string, userId: string) => Promise<void>>();
const containerGet = jest.fn<() => unknown>();
jest.mock("@/interface/controllers/team/team.controller", () => ({
  createTeamController: createController,
}));
jest.mock("@/interface/controllers/team/update-team.controller", () => ({
  updateTeamController: updateController,
}));
jest.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
jest.mock("@/infrastructure/di/inversify.config", () => ({
  container: { get: containerGet },
}));

type RouteResponse = { status: number; json: () => Promise<unknown> };
let POST: (request: never) => Promise<RouteResponse>;
let PATCH: (
  request: never,
  props: { params: Promise<{ teamId: string }> },
) => Promise<RouteResponse>;
const TEAM_ID = "507f1f77bcf86cd799439011";
const SESSION = { user: { id: "user-1", name: "Test User" } };

beforeEach(async () => {
  jest.clearAllMocks();
  getSession.mockResolvedValue(SESSION);
  verifyAdmin.mockResolvedValue(undefined);
  containerGet.mockReturnValue({ verifyIsTeamAdmin: verifyAdmin });
  ({ POST } = await import("@/app/api/teams/route"));
  ({ PATCH } = await import("@/app/api/teams/[teamId]/route"));
});

describe.each(["zod-async"] as const)(
  "create-team %s through POST route",
  (variant) => {
    it("runs creation inside ITransactionRunner and creates owner plus three defaults", async () => {
      const team = { id: "team-1", name: "Volley", nickname: "" };
      const owner = { id: "player-1" };
      const lineups = [{}, {}, {}];
      const update = jest.fn(async (_id: string, _patch: unknown) => ({
        ...team,
        ownerPlayerId: owner.id,
      }));
      const playerCreate = jest.fn(async (_input: unknown) => owner);
      const teamCreate = jest.fn(async (input: unknown) => {
        expect(input).toMatchObject({ nickname: "", lineups });
        return team;
      });
      const run = jest.fn(async (work: () => Promise<unknown>) => work());
      const { CreateTeamUseCase } =
        await import("@/applications/usecases/team/create-team.usecase");
      const useCase = new CreateTeamUseCase(
        { create: teamCreate, update } as never,
        { create: playerCreate } as never,
        { run } as never,
      );
      createController.mockImplementation((input) =>
        createTeamVariants[variant](
          (({ name, nickname }) => ({ name, nickname }))(
            input as { name: string; nickname?: string },
          ),
          (value) =>
            useCase.execute({
              ...value,
              userId: "user-1",
              userName: "Test User",
            }),
        ),
      );
      const req = routeRequest("http://localhost/api/teams", "POST", {
        name: "Volley",
        nickname: "",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ ...team, ownerPlayerId: owner.id });
      expect(run).toHaveBeenCalledTimes(1);
      expect(teamCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Volley",
          nickname: "",
          lineups: expect.any(Array),
        }),
      );
      expect(playerCreate).toHaveBeenCalledWith({
        name: "Test User",
        status: "JOINED",
        number: 1,
        role: "ADMIN",
        teamId: "team-1",
        userId: "user-1",
      });
      expect(update).toHaveBeenCalledWith("team-1", {
        ownerPlayerId: "player-1",
      });
    });

    it.each<[Record<string, unknown>, string]>([
      [
        { name: "Volley", nickname: "V", unexpected: true },
        "strict unknown key",
      ],
      [{ name: 12 }, "wrong type without coercion"],
    ])("rejects invalid request (%s)", async (body) => {
      const log = silenceConsoleError();
      const res = await POST(
        routeRequest("http://localhost/api/teams", "POST", body) as never,
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({
        code: "VALIDATION",
        reason: "INVALID_INPUT",
      });
      expect(createController).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it("preserves missing-session contract", async () => {
      const log = jest.spyOn(console, "warn").mockImplementation(() => {});
      getSession.mockResolvedValue(null);
      const res = await POST(
        routeRequest("http://localhost/api/teams", "POST", {
          name: "Volley",
        }) as never,
      );
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        code: "AUTHENTICATION",
        reason: "SESSION_REQUIRED",
      });
      expect(createController).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it("maps repository failure inside transaction to the route error contract", async () => {
      const log = jest.spyOn(console, "error").mockImplementation(() => {});
      const failure = new Error("database offline");
      const run = jest.fn(async (work: () => Promise<unknown>) => work());
      const { CreateTeamUseCase } =
        await import("@/applications/usecases/team/create-team.usecase");
      createController.mockImplementation((input) =>
        new CreateTeamUseCase(
          {
            create: async () => {
              throw failure;
            },
          } as never,
          {} as never,
          { run } as never,
        ).execute(input as never),
      );
      const res = await POST(
        routeRequest("http://localhost/api/teams", "POST", {
          name: "Volley",
        }) as never,
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        code: "UNEXPECTED",
        reason: "UNHANDLED_ERROR",
      });
      expect(run).toHaveBeenCalledTimes(1);
      log.mockRestore();
    });
  },
);

describe.each(["async"] as const)(
  "update-team %s through PATCH route",
  (variant) => {
    it("updates after route-layer authorization", async () => {
      updateController.mockImplementation(
        (teamId, input) =>
          updateTeamStyleVariants[variant](input, async (value) => ({
            id: teamId,
            ...value,
          })) as Promise<Record<string, unknown>>,
      );
      const req = routeRequest(
        `http://localhost/api/teams/${TEAM_ID}`,
        "PATCH",
        { name: "Renamed" },
      );
      const res = await PATCH(req as never, {
        params: Promise.resolve({ teamId: TEAM_ID }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ id: TEAM_ID, name: "Renamed" });
      expect(verifyAdmin).toHaveBeenCalledWith(TEAM_ID, "user-1");
      expect(updateController).toHaveBeenCalledWith(TEAM_ID, {
        name: "Renamed",
        nickname: undefined,
      });
    });

    it("rejects invalid input and retains route-layer permission denial", async () => {
      const log = silenceConsoleError();
      const invalid = await PATCH(
        routeRequest(`http://localhost/api/teams/${TEAM_ID}`, "PATCH", {
          extra: true,
        }) as never,
        { params: Promise.resolve({ teamId: TEAM_ID }) },
      );
      expect(invalid.status).toBe(400);
      expect(updateController).not.toHaveBeenCalled();
      verifyAdmin.mockRejectedValueOnce(
        new AuthorizationError(
          AuthReason.INSUFFICIENT_ROLE,
          "Not a team admin",
        ),
      );
      const denied = await PATCH(
        routeRequest(`http://localhost/api/teams/${TEAM_ID}`, "PATCH", {
          name: "Renamed",
        }) as never,
        { params: Promise.resolve({ teamId: TEAM_ID }) },
      );
      expect(denied.status).toBe(403);
      expect(await denied.json()).toEqual({
        code: "AUTHORIZATION",
        reason: "INSUFFICIENT_ROLE",
      });
      expect(updateController).not.toHaveBeenCalled();
      log.mockRestore();
    });
  },
);
