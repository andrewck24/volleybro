import { renderHook } from "@testing-library/react";
import { useTeam, useTeamPlayers } from "@/hooks/use-data";

const capturedKeys: unknown[] = [];

jest.mock("swr", () => {
  const mockUseSWR = jest.fn((key: unknown) => {
    capturedKeys.push(key);
    return {
      data: undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    };
  });
  const useSWRConfig = jest.fn(() => ({ cache: new Map() }));
  return {
    __esModule: true,
    default: mockUseSWR,
    useSWRConfig,
  };
});

describe("useTeam", () => {
  beforeEach(() => {
    capturedKeys.length = 0;
  });

  it("does NOT fetch when teamId is empty string", () => {
    renderHook(() => useTeam(""));
    expect(capturedKeys).not.toContain("/api/teams/");
    expect(capturedKeys).not.toContain("/api/teams/undefined");
    expect(capturedKeys.every((k) => k === null)).toBe(true);
  });

  it("does NOT fetch when teamId is undefined", () => {
    renderHook(() => useTeam(undefined as unknown as string));
    expect(capturedKeys).not.toContain("/api/teams/undefined");
    expect(capturedKeys.every((k) => k === null)).toBe(true);
  });

  it("returns safe defaults when teamId is falsy", () => {
    const { result } = renderHook(() => useTeam(""));
    expect(result.current.team).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches normally when teamId is provided", () => {
    renderHook(() => useTeam("team-123"));
    expect(capturedKeys).toContain("/api/teams/team-123");
  });
});

describe("useTeamPlayers", () => {
  beforeEach(() => {
    capturedKeys.length = 0;
  });

  it("does NOT fetch when teamId is empty string", () => {
    renderHook(() => useTeamPlayers(""));
    expect(capturedKeys).not.toContain("/api/teams//players");
    expect(capturedKeys).not.toContain("/api/teams/undefined/players");
    expect(capturedKeys.every((k) => k === null)).toBe(true);
  });

  it("does NOT fetch when teamId is undefined", () => {
    renderHook(() => useTeamPlayers(undefined as unknown as string));
    expect(capturedKeys).not.toContain("/api/teams/undefined/players");
    expect(capturedKeys.every((k) => k === null)).toBe(true);
  });

  it("returns safe defaults when teamId is falsy", () => {
    const { result } = renderHook(() => useTeamPlayers(""));
    expect(result.current.players).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches normally when teamId is provided", () => {
    renderHook(() => useTeamPlayers("team-123"));
    expect(capturedKeys).toContain("/api/teams/team-123/players");
  });
});
