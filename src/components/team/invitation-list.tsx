'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Player } from '@/entities/player';
import { getPlayerStatus } from '@/entities/player';
import { useToast } from '@/components/ui/use-toast';
import { ROLE_LABELS } from '@/lib/constants/labels';

interface InvitationListProps {
  invitations: Player[];
  isLoading?: boolean;
  isSubmitting?: boolean;
  onAccept: (playerId: string) => Promise<void>;
  onReject: (playerId: string) => Promise<void>;
}

/**
 * T041 [US2] InvitationList - 顯示待決邀請的元件
 * 用於展示使用者收到的所有邀請，並允許接受或拒絕
 *
 * T124: Toast notifications for invitation actions
 * - Shows success toast when invitation is accepted
 * - Shows error toast if acceptance fails
 * - Shows success toast when invitation is rejected
 * - Shows error toast if rejection fails
 */
export function InvitationList({
  invitations,
  isLoading = false,
  isSubmitting = false,
  onAccept,
  onReject,
}: InvitationListProps) {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter only pending invitations
  const pendingInvitations = invitations.filter(
    (player) => getPlayerStatus(player) === 'INVITED'
  );

  const handleAccept = async (playerId: string) => {
    setProcessingId(playerId);
    try {
      await onAccept(playerId);
      // T124: Show success toast notification
      toast({
        title: '邀請已接受',
        description: '您已加入隊伍',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '接受邀請失敗，請重試';
      // T124: Show error toast notification
      toast({
        title: '接受邀請失敗',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (playerId: string) => {
    setProcessingId(playerId);
    try {
      await onReject(playerId);
      // T124: Show success toast notification
      toast({
        title: '邀請已拒絕',
        description: '您已拒絕了該邀請',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '拒絕邀請失敗，請重試';
      // T124: Show error toast notification
      toast({
        title: '拒絕邀請失敗',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingInvitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>待決邀請</CardTitle>
          <CardDescription>
            您目前沒有任何待決的邀請
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>待決邀請</CardTitle>
        <CardDescription>
          您有 {pendingInvitations.length} 個待決的邀請
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation._id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex-1">
                <h3 className="font-medium">團隊邀請</h3>
                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>您被邀請以</span>
                    <Badge variant="secondary">
                      {ROLE_LABELS[invitation.role] || invitation.role}
                    </Badge>
                    <span>身份加入隊伍</span>
                  </div>
                  {invitation.email && (
                    <p>邀請電子郵件：{invitation.email}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(invitation._id)}
                  disabled={isLoading || isSubmitting || processingId !== null}
                  aria-busy={processingId === invitation._id}
                >
                  拒絕
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation._id)}
                  disabled={isLoading || isSubmitting || processingId !== null}
                  aria-busy={processingId === invitation._id}
                >
                  接受
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
