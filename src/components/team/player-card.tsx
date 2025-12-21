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

interface PlayerCardProps {
  player: Player;
  isOwner?: boolean;
  canManage?: boolean;
  currentUserId?: string;
  onEdit?: (player: Player) => void;
  onRemove?: (playerId: string) => void;
  onPromote?: (playerId: string) => void;
  onLeave?: (playerId: string) => void;
  onDelete?: (playerId: string) => void;
  onCancelInvitation?: (playerId: string) => void;
  isLoading?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: '成員',
  ADMIN: '管理員',
  OWNER: '隊長',
};

const POSITION_LABELS: Record<string, string> = {
  OH: '主攻手',
  MB: '中塊',
  OP: '對角',
  S: '舉球員',
  L: '自由人',
  '': '未指定',
};

const STATUS_LABELS: Record<string, string> = {
  JOINED: '已加入',
  INVITED: '待決',
  PURE_PLAYER: '純球員',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  JOINED: 'default',
  INVITED: 'secondary',
  PURE_PLAYER: 'outline',
};

/**
 * T054 [US3] PlayerCard - 顯示單一球員資訊的元件
 * 用於隊伍成員列表中顯示每個球員的詳細資訊
 */
export function PlayerCard({
  player,
  isOwner = false,
  canManage = false,
  currentUserId,
  onEdit,
  onRemove,
  onPromote,
  onLeave,
  onDelete,
  onCancelInvitation,
  isLoading = false,
}: PlayerCardProps) {
  const status = getPlayerStatus(player);
  const statusLabel = STATUS_LABELS[status] || status;
  const statusColor = STATUS_COLORS[status] || 'default';
  const positionLabel = POSITION_LABELS[player.position] || player.position;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{player.name}</CardTitle>
            <CardDescription className="mt-1">
              {player.number > 0 && `球號: ${player.number}`}
              {player.number > 0 && positionLabel && ' • '}
              {positionLabel}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={statusColor}>{statusLabel}</Badge>
            <Badge variant="secondary">{ROLE_LABELS[player.role] || player.role}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Player Info */}
          <div className="text-sm space-y-1">
            {player.userId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">使用者 ID:</span>
                <span className="font-medium">{player.userId}</span>
              </div>
            )}
            {player.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">電子郵件:</span>
                <span className="font-medium">{player.email}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t flex-wrap">
            {/* Edit Action */}
            {canManage && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(player)}
                disabled={isLoading}
              >
                編輯
              </Button>
            )}

            {/* Promote to Admin */}
            {canManage && onPromote && player.role === 'MEMBER' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPromote(player._id)}
                disabled={isLoading}
              >
                升級為管理員
              </Button>
            )}

            {/* Remove Member */}
            {canManage && onRemove && !isOwner && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRemove(player._id)}
                disabled={isLoading}
              >
                移除
              </Button>
            )}

            {/* Leave Team - T094 US6 */}
            {onLeave && player.userId === currentUserId && !isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLeave(player._id)}
                disabled={isLoading}
              >
                離開隊伍
              </Button>
            )}

            {/* Delete Player - T094 US6 */}
            {canManage && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(player._id)}
                disabled={isLoading}
              >
                刪除球員
              </Button>
            )}

            {/* Cancel Invitation - T100 US7 */}
            {canManage && onCancelInvitation && status === 'INVITED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelInvitation(player._id)}
                disabled={isLoading}
              >
                取消邀請
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
