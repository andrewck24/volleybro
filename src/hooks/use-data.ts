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
import { useActiveTeamPreference } from "@/hooks/use-active-team-preference";
import {
  decidePreferenceAction,
  resolveActiveTeam,
  type PreferenceAction,
  type PreferenceState,
} from "@/lib/features/team/active-team-preference";
import { useCallback, useEffect, useMemo } from "react";
import useSWR, { useSWRConfig, type SWRConfiguration } from "swr";
import useSWRInfinite from "swr/infinite";

export { ApiClientError };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetcher = (url: string) => apiClient<any>(url);

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

export const useUser = () => {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    User,
    ApiClientError
  >("/api/users", fetcher, SWR_CONFIG.DEFAULT);

  return { user: data, error, isLoading, isValidating, mutate };
};

export const useProfile = () => {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Profile,
    ApiClientError
  >("/api/profiles", fetcher, SWR_CONFIG.DEFAULT);

  return { profile: data, error, isLoading, isValidating, mutate };
};

export const useUserPlayers = (userId: string | undefined) => {
  const key = userId ? `/api/users/${userId}/players` : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    UserPlayerView[],
    ApiClientError
  >(key, fetcher, SWR_CONFIG.LIST);

  return { players: data ?? [], error, isLoading, isValidating, mutate };
};

// Only a refusal says the user is not a member; a network failure or timeout
// says nothing, so it must not discard the preference.
const isTeamRefusal = (error: ApiClientError | undefined) =>
  error?.code === "AUTHORIZATION" || error?.code === "NOT_FOUND";

const useTeamRequest = (
  teamId: string,
  onError?: SWRConfiguration<TeamView, ApiClientError>["onError"],
) => {
  const key = teamId ? `/api/teams/${teamId}` : null;
  const hasCache = useHasCache(key ?? "");
  return useSWR<TeamView, ApiClientError>(key, fetcher, {
    ...SWR_CONFIG.DEFAULT,
    revalidateOnMount: !hasCache,
    // An explicit `undefined` would override the global error handler and drop the toast for `useTeam`.
    ...(onError && { onError }),
  });
};

// Its refusal is an expected answer, so it must not reach the global error toast.
const usePreferredTeam = (teamId: string | undefined) => {
  const swrConfig = useSWRConfig();
  const { data, error } = useTeamRequest(teamId ?? "", (err, key) => {
    if (!isTeamRefusal(err)) swrConfig.onError?.(err, key, swrConfig);
  });
  return { team: data, error };
};

const usePersistActiveTeam = (preferenceAction: PreferenceAction) => {
  const { save, clear } = useActiveTeamPreference();

  useEffect(() => {
    if (preferenceAction.type === "discard") clear();
    if (preferenceAction.type === "store") {
      save({
        userId: preferenceAction.userId,
        teamId: preferenceAction.teamId,
      });
    }
  }, [preferenceAction, save, clear]);
};

// Loads the players list the new Game dialog needs, so it opens without a skeleton.
const usePreloadTeamPlayers = (teamId: string | undefined) => {
  const { cache, mutate } = useSWRConfig();
  const key = teamId ? `/api/teams/${teamId}/players` : null;

  useEffect(() => {
    if (!key || cache.get(key) !== undefined) return;
    mutate(key, fetcher(key), { revalidate: false }).catch(() => {});
  }, [key, cache, mutate]);
};

/** The verified preference, else the full resolution. See ADR-0098 and ADR-0099. */
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
  const { preference } = useActiveTeamPreference();
  const { team: preferredTeam, error: preferredTeamError } = usePreferredTeam(
    preference?.teamId,
  );

  const isUserUnavailable = !!userError && !user;
  const preferredTeamStatus = isTeamRefusal(preferredTeamError)
    ? "refused"
    : isUserUnavailable || (!preferredTeam && preferredTeamError)
      ? "failed"
      : preferredTeam
        ? "confirmed"
        : "pending";
  const joinedTeamIds = players
    .filter((p) => p.status === PlayerStatus.JOINED && p.teamId)
    .map((p) => p.teamId!);
  const preferenceState: PreferenceState = {
    preference,
    userId: user?.id,
    preferredTeamStatus,
  };
  const { teamId, verification } = resolveActiveTeam({
    ...preferenceState,
    profileActiveTeamId: profile?.activeTeamId,
    joinedTeamIds,
  });
  const { team } = useTeam(teamId ?? "");
  usePersistActiveTeam(
    decidePreferenceAction({
      ...preferenceState,
      teamId,
      loadedTeamId: team ? teamId : undefined,
    }),
  );
  usePreloadTeamPlayers(preference?.teamId);

  const isLoading =
    verification === "pending" ||
    (verification === "unused" &&
      (userLoading || profileLoading || playersLoading));
  const error = userError ?? profileError;
  const mutate = useCallback(
    () => Promise.all([mutateUser(), mutateProfile()]),
    [mutateUser, mutateProfile],
  );

  return { teamId, isLoading, error, mutate };
};

export const useTeam = (teamId: string) => {
  const { data, error, isLoading, isValidating, mutate } =
    useTeamRequest(teamId);

  return { team: data, error, isLoading, isValidating, mutate };
};

export const useTeamPlayers = (teamId: string) => {
  const key = teamId ? `/api/teams/${teamId}/players` : null;
  const hasCache = useHasCache(key ?? "");
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    PlayerView[],
    ApiClientError
  >(key, fetcher, {
    ...SWR_CONFIG.LIST,
    revalidateOnMount: !hasCache,
  });

  return { players: data, error, isLoading, isValidating, mutate };
};

export const usePlayer = (playerId: string) => {
  const key = `/api/players/${playerId}`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    PlayerView,
    ApiClientError
  >(playerId ? key : null, fetcher, {
    ...SWR_CONFIG.DEFAULT,
    revalidateOnMount: !hasCache,
  });

  return { player: data, error, isLoading, isValidating, mutate };
};

export const useGame = (gameId: string) => {
  const key = `/api/games/${gameId}`;
  const hasCache = useHasCache(key);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    GameView,
    ApiClientError
  >(gameId ? key : null, fetcher, {
    ...SWR_CONFIG.DEFAULT,
    revalidateOnMount: !hasCache,
  });

  const pending = useAppSelector((state) => state.pendingWrites.pending);
  const game = useMemo(
    () => mergePendingEntries(data, pending, gameId),
    [data, pending, gameId],
  );

  return { game, error, isLoading, isValidating, mutate };
};

export const useGameSummaries = (teamId: string | undefined) => {
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
    }>(getKey, fetcher, SWR_CONFIG.INFINITE);

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
