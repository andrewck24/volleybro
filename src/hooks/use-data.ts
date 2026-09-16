import { PlayerStatus } from "@/entities/player";
import type { Profile } from "@/entities/profile";
import type { User } from "@/entities/user";
import { apiClient, ApiClientError } from "@/lib/api/api-client";
import { mergePendingEntries } from "@/lib/features/game/pending-writes";
import type { GameSummaryView, GameView } from "@/lib/features/game/types";
import type {
  PlayerView,
  TeamView,
  UserPlayerView,
} from "@/lib/features/team/types";
import { useAppSelector } from "@/lib/redux/hooks";
import { useCallback, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";

export { ApiClientError };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultFetcher = (url: string) => apiClient<any>(url);

const useHasCache = (key: string) => {
  const { cache } = useSWRConfig();
  return cache.get(key) !== undefined;
};

const SWR_CONFIG = {
  DEFAULT: {
    dedupingInterval: 5 * 60 * 1000,
    focusThrottleInterval: 5 * 60 * 1000,
    errorRetryInterval: 5000,
  },
  LIST: {
    dedupingInterval: 2 * 60 * 1000,
    focusThrottleInterval: 3 * 60 * 1000,
    errorRetryInterval: 5000,
  },
  INFINITE: {
    dedupingInterval: 2 * 60 * 1000,
    focusThrottleInterval: 3 * 60 * 1000,
    errorRetryInterval: 5000,
  },
} as const;

export const useUser = (fetcher = defaultFetcher, options = {}) => {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    User,
    ApiClientError
  >("/api/users", fetcher, { ...SWR_CONFIG.DEFAULT, ...options });

  return { user: data, error, isLoading, isValidating, mutate };
};

export const useProfile = (fetcher = defaultFetcher, options = {}) => {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Profile,
    ApiClientError
  >("/api/profiles", fetcher, { ...SWR_CONFIG.DEFAULT, ...options });

  return { profile: data, error, isLoading, isValidating, mutate };
};

export const useUserPlayers = (
  userId: string | undefined,
  fetcher = defaultFetcher,
  options = {},
) => {
  const key = userId ? `/api/users/${userId}/players` : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    UserPlayerView[],
    ApiClientError
  >(key, fetcher, { ...SWR_CONFIG.LIST, ...options });

  return { players: data ?? [], error, isLoading, isValidating, mutate };
};

/**
 * The active team: `profile.activeTeamId` when the user is still a member of
 * that team, otherwise the first team they have joined, otherwise none. The
 * server never picks a replacement, so a stale `activeTeamId` (a membership
 * that ended after it was set) is resolved here, from data already being
 * fetched for other reasons.
 */
export const useActiveTeamId = () => {
  const {
    user,
    isLoading: userLoading,
    error: userError,
    mutate: mutateUser,
  } = useUser();
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
    mutate: mutateProfile,
  } = useProfile();
  const { players, isLoading: playersLoading } = useUserPlayers(user?.id);

  const isLoading = userLoading || profileLoading || playersLoading;
  const error = userError ?? profileError;
  const mutate = useCallback(
    () => Promise.all([mutateUser(), mutateProfile()]),
    [mutateUser, mutateProfile],
  );

  const joinedPlayers = players.filter(
    (p) => p.status === PlayerStatus.JOINED && p.teamId,
  );
  const isStillJoined = joinedPlayers.some(
    (p) => p.teamId === profile?.activeTeamId,
  );
  const teamId = isStillJoined
    ? profile?.activeTeamId
    : joinedPlayers[0]?.teamId;

  return { teamId, isLoading, error, mutate };
};

export const useTeam = (
  teamId: string,
  fetcher = defaultFetcher,
  options = {},
) => {
  const key = teamId ? `/api/teams/${teamId}` : null;
  const hasCache = useHasCache(key ?? "");
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    TeamView,
    ApiClientError
  >(key, fetcher, {
    ...SWR_CONFIG.DEFAULT,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return { team: data, error, isLoading, isValidating, mutate };
};

export const useTeamPlayers = (
  teamId: string,
  fetcher = defaultFetcher,
  options = {},
) => {
  const key = teamId ? `/api/teams/${teamId}/players` : null;
  const hasCache = useHasCache(key ?? "");
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    PlayerView[],
    ApiClientError
  >(key, fetcher, {
    ...SWR_CONFIG.LIST,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return { players: data, error, isLoading, isValidating, mutate };
};

export const usePlayer = (
  playerId: string,
  fetcher = defaultFetcher,
  options = {},
) => {
  const key = `/api/players/${playerId}`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    PlayerView,
    ApiClientError
  >(playerId ? key : null, fetcher, {
    ...SWR_CONFIG.DEFAULT,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return { player: data, error, isLoading, isValidating, mutate };
};

export const useGame = (
  gameId: string,
  fetcher = defaultFetcher,
  options = {},
) => {
  const key = `/api/games/${gameId}`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    GameView,
    ApiClientError
  >(gameId ? key : null, fetcher, {
    ...SWR_CONFIG.DEFAULT,
    revalidateOnMount: !hasCache,
    ...options,
  });

  const pending = useAppSelector((state) => state.pendingWrites.pending);
  const game = useMemo(
    () => mergePendingEntries(data, pending, gameId),
    [data, pending, gameId],
  );

  return { game, error, isLoading, isValidating, mutate };
};

export const useGameSummaries = (
  teamId: string | undefined,
  fetcher = defaultFetcher,
  options = {},
) => {
  const getKey = (
    pageIndex: number,
    previousPageData: { hasMore: boolean; lastId: string } | null,
  ) => {
    if (!teamId) return null;
    if (previousPageData && !previousPageData.hasMore) return null;
    if (pageIndex === 0) return `/api/games?ti=${teamId}`;
    return `/api/games?ti=${teamId}&li=${previousPageData!.lastId}`;
  };

  const { data, error, isLoading, isValidating, mutate, size, setSize } =
    useSWRInfinite<{
      gameSummaries: GameSummaryView[];
      hasMore: boolean;
      lastId: string;
    }>(getKey, fetcher, {
      ...SWR_CONFIG.INFINITE,
      ...options,
    });

  const gameSummaries = data
    ? data.flatMap((page) => page.gameSummaries || [])
    : [];
  const isEmpty = data?.[0]?.gameSummaries?.length === 0;
  const isReachingEnd = isEmpty || (data && !data[data.length - 1]?.hasMore);
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  return {
    gameSummaries,
    error,
    isLoading,
    isValidating,
    mutate,
    size,
    setSize,
    isEmpty,
    isReachingEnd,
    isLoadingMore,
  };
};
