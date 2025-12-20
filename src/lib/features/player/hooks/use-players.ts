'use client';

import useSWR, { useSWRConfig } from 'swr';
import type { Player } from '@/entities/player';

class FetchError extends Error {
  info: unknown;
  status: number;

  constructor(message: string, info: unknown, status: number) {
    super(message);
    this.info = info;
    this.status = status;
  }
}

const defaultFetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const info = await res.json();
    const error = new FetchError(
      'An error occurred while fetching the data.',
      info,
      res.status
    );
    throw error;
  }

  return res.json();
};

const useHasCache = (key: string | null) => {
  const { cache } = useSWRConfig();
  if (!key) return false;
  return cache.get(key) !== undefined;
};

/**
 * T028 [US1] useUserPlayers - 獲取使用者的所有邀請
 * 返回使用者收到的所有邀請（待接受、待拒絕）
 */
export const useUserPlayers = (
  userId: string,
  fetcher = defaultFetcher,
  options = {}
) => {
  const key = userId ? `/api/users/${userId}/players` : null;
  const hasCache = useHasCache(key);

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Player[],
    FetchError
  >(key, fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return {
    players: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

/**
 * T040 [US2] usePlayerStatusMutation - 更新 Player 狀態的 mutation
 * 用於接受、拒絕邀請操作
 */
export const usePlayerStatusMutation = () => {
  const { mutate } = useSWRConfig();

  const updatePlayerStatus = async (
    playerId: string,
    action: 'accept' | 'reject' | 'cancel' | 'leave'
  ) => {
    try {
      const response = await fetch(`/api/players/${playerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new FetchError(
          'Failed to update player status',
          error,
          response.status
        );
      }

      const data = await response.json();

      // 重新驗證相關的 SWR caches
      mutate((key) => {
        if (typeof key === 'string') {
          return (
            key.includes('/api/users/') ||
            key.includes('/api/teams/') ||
            key.includes('/api/players/')
          );
        }
        return false;
      });

      return data;
    } catch (err) {
      throw err;
    }
  };

  return {
    updatePlayerStatus,
  };
};

/**
 * T053 [US3] useTeamPlayers - 獲取隊伍的所有球員列表
 * 包含已加入成員和待決的邀請
 */
export const useTeamPlayers = (
  teamId: string,
  fetcher = defaultFetcher,
  options = {}
) => {
  const key = teamId ? `/api/teams/${teamId}/players` : null;
  const hasCache = useHasCache(key);

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Player[],
    FetchError
  >(key, fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return {
    players: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

/**
 * usePlayerDetail - 獲取單一球員詳細資訊
 * 用於查看特定球員的資訊
 */
export const usePlayerDetail = (
  playerId: string,
  fetcher = defaultFetcher,
  options = {}
) => {
  const key = playerId ? `/api/players/${playerId}` : null;
  const hasCache = useHasCache(key);

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Player,
    FetchError
  >(key, fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnMount: !hasCache,
    ...options,
  });

  return {
    player: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};
