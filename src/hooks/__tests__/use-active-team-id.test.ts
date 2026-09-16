import { renderHook } from "@testing-library/react";
import { useActiveTeamId } from "@/hooks/use-data";
import { PlayerStatus } from "@/entities/player";

const responses = new Map<string, unknown>();

jest.mock("swr", () => {
  const mockUseSWR = jest.fn((key: string | null) => ({
    data: key ? responses.get(key) : undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: jest.fn(),
  }));
  const useSWRConfig = jest.fn(() => ({ cache: new Map() }));
  return { __esModule: true, default: mockUseSWR, useSWRConfig };
});

function setup({
  activeTeamId,
  joinedTeamIds,
}: {
  activeTeamId?: string;
  joinedTeamIds: string[];
}) {
  responses.set("/api/users", { id: "user-1" });
  responses.set("/api/profiles", { id: "profile-1", activeTeamId });
  responses.set(
    "/api/users/user-1/players",
    joinedTeamIds.map((teamId, i) => ({
      id: `player-${i}`,
      teamId,
      status: PlayerStatus.JOINED,
    })),
  );
}

describe("useActiveTeamId", () => {
  beforeEach(() => responses.clear());

  it("uses activeTeamId when the user is still a member of that team", () => {
    setup({ activeTeamId: "team-2", joinedTeamIds: ["team-1", "team-2"] });

    const { result } = renderHook(() => useActiveTeamId());

    expect(result.current.teamId).toBe("team-2");
  });

  it("falls back to the first joined team when activeTeamId is stale", () => {
    setup({ activeTeamId: "team-9", joinedTeamIds: ["team-1", "team-2"] });

    const { result } = renderHook(() => useActiveTeamId());

    expect(result.current.teamId).toBe("team-1");
  });

  it("returns none when the user has no joined team", () => {
    setup({ activeTeamId: undefined, joinedTeamIds: [] });

    const { result } = renderHook(() => useActiveTeamId());

    expect(result.current.teamId).toBeUndefined();
  });
});
