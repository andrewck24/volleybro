'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * T124: usePlayerActions Hook
 *
 * Provides wrapped player actions with built-in toast notifications
 * Handles success and error messages for all player operations
 */
export function usePlayerActions(teamId: string) {
  const { toast } = useToast();

  /**
   * Promote a player to admin
   */
  const promotePlayer = useCallback(
    async (playerId: string, playerName: string) => {
      try {
        const response = await fetch(
          `/api/players/${playerId}/role`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'ADMIN' }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '升級失敗');
        }

        toast({
          title: '升級成功',
          description: `${playerName} 已升級為管理員`,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '升級失敗，請重試';
        toast({
          title: '升級失敗',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast]
  );

  /**
   * Remove a player from the team
   */
  const removePlayer = useCallback(
    async (playerId: string, playerName: string) => {
      try {
        const response = await fetch(
          `/api/players/${playerId}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '移除失敗');
        }

        toast({
          title: '移除成功',
          description: `${playerName} 已從隊伍中移除`,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '移除失敗，請重試';
        toast({
          title: '移除失敗',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast]
  );

  /**
   * Leave the team (current user)
   */
  const leaveTeam = useCallback(
    async (playerId: string) => {
      try {
        const response = await fetch(
          `/api/players/${playerId}/status`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'leave' }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '離開失敗');
        }

        toast({
          title: '已離開隊伍',
          description: '您已成功離開隊伍',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '離開失敗，請重試';
        toast({
          title: '離開失敗',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast]
  );

  /**
   * Delete a player permanently
   */
  const deletePlayer = useCallback(
    async (playerId: string, playerName: string) => {
      try {
        const response = await fetch(
          `/api/players/${playerId}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '刪除失敗');
        }

        toast({
          title: '刪除成功',
          description: `${playerName} 已永久刪除`,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '刪除失敗，請重試';
        toast({
          title: '刪除失敗',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast]
  );

  /**
   * Cancel an invitation
   */
  const cancelInvitation = useCallback(
    async (playerId: string) => {
      try {
        const response = await fetch(
          `/api/players/${playerId}/status`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cancel' }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '取消失敗');
        }

        toast({
          title: '邀請已取消',
          description: '該邀請已被取消',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '取消失敗，請重試';
        toast({
          title: '取消失敗',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast]
  );

  return {
    promotePlayer,
    removePlayer,
    leaveTeam,
    deletePlayer,
    cancelInvitation,
  };
}
