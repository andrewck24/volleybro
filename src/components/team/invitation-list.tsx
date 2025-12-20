'use client';

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

interface InvitationListProps {
  invitations: Player[];
  isLoading?: boolean;
  isSubmitting?: boolean;
  onAccept: (playerId: string) => Promise<void>;
  onReject: (playerId: string) => Promise<void>;
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: '成員',
  ADMIN: '管理員',
  OWNER: '隊長',
};

/**
 * T041 [US2] InvitationList - 顯示待決邀請的元件
 * 用於展示使用者收到的所有邀請，並允許接受或拒絕
 */
export function InvitationList({
  invitations,
  isLoading = false,
  isSubmitting = false,
  onAccept,
  onReject,
}: InvitationListProps) {
  // Filter only pending invitations
  const pendingInvitations = invitations.filter(
    (player) => getPlayerStatus(player) === 'INVITED'
  );

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
                  <p>
                    您被邀請以{' '}
                    <Badge variant="secondary">
                      {ROLE_LABELS[invitation.role] || invitation.role}
                    </Badge>{' '}
                    身份加入隊伍
                  </p>
                  {invitation.email && (
                    <p>邀請電子郵件：{invitation.email}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(invitation._id)}
                  disabled={isLoading || isSubmitting}
                >
                  拒絕
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAccept(invitation._id)}
                  disabled={isLoading || isSubmitting}
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
