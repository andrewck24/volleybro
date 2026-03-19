import type { Player } from "@/entities/player";
import { PlayerStatus } from "@/entities/player";
import type { Profile } from "@/entities/profile";
import type { MatchResult, Record } from "@/entities/record";
import type { Team } from "@/entities/team";
import type { User } from "@/entities/user";
import { apiClient, ApiClientError } from "@/lib/api/api-client";
import useSWR, { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";

/**
 * T126: Performance Optimization - SWR Configuration
 *
 * Centralized SWR configuration to:
 * - Reduce redundant API requests
 * - Optimize cache strategies per resource type
 * - Improve consistency across all data hooks
 */

export { ApiClientError };

const defaultFetcher = (url: string) => apiClient<any>(url);

const useHasCache = (key: string) => {
  const { cache } = useSWRConfig();
  return cache.get(key) !== undefined;
};

// T126: Optimized SWR configuration presets
// Deduplication intervals prevent redundant requests when multiple components mount simultaneously
const SWR_CONFIG = {
  // Default config for single-resource fetches (user, team, record)
  DEFAULT: {
    dedupingInterval: 5 * 60 * 1000, // 5 minutes - prevent concurrent requests
    focusThrottleInterval: 5 * 60 * 1000, // 5 minutes - prevent refetch on window focus
    errorRetryInterval: 5000, // 5 seconds - retry failed requests
  },
  // Config for frequently-changing data (lists)
  LIST: {
    dedupingInterval: 2 * 60 * 1000, // 2 minutes - more aggressive for lists
    focusThrottleInterval: 3 * 60 * 1000,
    errorRetryInterval: 5000,
  },
  // Config for infinite scrolling data
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
    Player[],
    ApiClientError
  >(key, fetcher, { ...SWR_CONFIG.LIST, ...options });

  return { players: data ?? [], error, isLoading, isValidating, mutate };
};

/**
 * Returns the active team ID for the current user.
 * Falls back to the first JOINED player's teamId when profile.activeTeamId is null.
 */
export const useActiveTeamId = () => {
  const { user } = useUser();
  const { profile } = useProfile();
  const { players } = useUserPlayers(user?._id);

  if (profile?.activeTeamId) return profile.activeTeamId;

  const firstJoined = players.find(
    (p) => p.status === PlayerStatus.JOINED && p.teamId,
  );
  return firstJoined?.teamId ?? undefined;
};

export const useTeam = (
  teamId: string,
  fetcher = defaultFetcher,
  options = {},
) => {
  const key = `/api/teams/${teamId}`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Team,
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
  const key = `/api/teams/${teamId}/players`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Player[],
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
    Player,
    ApiClientError
  >(playerId ? key : null, fetcher, {
    ...SWR_CONFIG.DEFAULT,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return { player: data, error, isLoading, isValidating, mutate };
};

export const useRecord = (
  recordId: string,
  fetcher = defaultFetcher,
  options = {},
) => {
  const key = `/api/records/${recordId}`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Record,
    ApiClientError
  >(recordId ? key : null, fetcher, {
    ...SWR_CONFIG.DEFAULT,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return { record: data, error, isLoading, isValidating, mutate };
};

export const useMatches = (
  teamId: string,
  fetcher = defaultFetcher,
  options = {},
) => {
  const getKey = (
    pageIndex: number,
    previousPageData: { hasMore: boolean; lastId: string } | null,
  ) => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;

    // First page, no teamId query param needed
    if (pageIndex === 0) return `/api/matches?ti=${teamId}`;

    // Add the lastId from the previous page
    return `/api/matches?ti=${teamId}&li=${previousPageData!.lastId}`;
  };

  const { data, error, isLoading, isValidating, mutate, size, setSize } =
    useSWRInfinite<{
      matches: MatchResult[];
      hasMore: boolean;
      lastId: string;
    }>(getKey, fetcher, {
      ...SWR_CONFIG.INFINITE,
      ...options,
    });

  const matches = data ? data.flatMap((page) => page.matches || []) : [];
  const isEmpty = data?.[0]?.matches?.length === 0;
  const isReachingEnd = isEmpty || (data && !data[data.length - 1]?.hasMore);
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  return {
    matches,
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
