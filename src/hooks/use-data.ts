import useSWR, { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";
import type { User } from "@/entities/user";
import type { Profile } from "@/entities/profile";
import type { Team } from "@/entities/team";
import type { Player } from "@/entities/player";
import type { Record, MatchResult } from "@/entities/record";

class FetchError extends Error {
  info: any;
  status: number;

  constructor(message: string, info: any, status: number) {
    super(message);
    this.info = info;
    this.status = status;
  }
}

const defaultFetcher = async (url: string) => {
  const res = await fetch(url);

  // If the status code is not in the range 200-299,
  // try to parse and throw it.
  if (!res.ok) {
    const info = await res.json();
    const error = new FetchError(
      "An error occurred while fetching the data.",
      info,
      res.status
    );
    throw error;
  }

  return res.json();
};

const useHasCache = (key: string) => {
  const { cache } = useSWRConfig();
  return cache.get(key) !== undefined;
};

export const useUser = (fetcher = defaultFetcher, options = {}) => {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    User,
    FetchError
  >("/api/users", fetcher, { dedupingInterval: 5 * 60 * 1000, ...options });

  return { user: data, error, isLoading, isValidating, mutate };
};

export const useProfile = (fetcher = defaultFetcher, options = {}) => {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Profile,
    FetchError
  >("/api/profiles", fetcher, { dedupingInterval: 5 * 60 * 1000, ...options });

  return { profile: data, error, isLoading, isValidating, mutate };
};

export const useUserTeams = (fetcher = defaultFetcher, options = {}) => {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "/api/users/teams",
    fetcher,
    { dedupingInterval: 5 * 60 * 1000, ...options }
  );

  return { teams: data, error, isLoading, isValidating, mutate };
};

export const useTeam = (
  teamId: string,
  fetcher = defaultFetcher,
  options = {}
) => {
  const key = `/api/teams/${teamId}`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Team,
    FetchError
  >(key, fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return { team: data, error, isLoading, isValidating, mutate };
};

export const useTeamMembers = (
  teamId: string,
  fetcher = defaultFetcher,
  options = {}
) => {
  const key = `/api/teams/${teamId}/members`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Player[],
    FetchError
  >(key, fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return { members: data, error, isLoading, isValidating, mutate };
};

export const useRecord = (
  recordId: string,
  fetcher = defaultFetcher,
  options = {}
) => {
  const key = `/api/records/${recordId}`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Record,
    FetchError
  >(recordId ? key : null, fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return { record: data, error, isLoading, isValidating, mutate };
};

export const useMatches = (
  teamId: string,
  fetcher = defaultFetcher,
  options = {}
) => {
  const getKey = (pageIndex: number, previousPageData: any) => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;

    // First page, no lastId needed
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
      dedupingInterval: 5 * 60 * 1000,
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
