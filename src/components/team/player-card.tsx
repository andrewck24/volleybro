"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Player } from "@/entities/player";
import { getPlayerStatus } from "@/entities/player";
import {
  POSITION_LABELS,
  ROLE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/constants/labels";

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

/**
 * T054 [US3] PlayerCard - 顯示單一球員資訊的元件
 * 用於隊伍成員列表中顯示每個球員的詳細資訊
 *
 * T123: Accessibility improvements
 * - ARIA labels for screen readers
 * - Keyboard navigation support
 * - Focus management for interactive elements
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
  const statusColor = STATUS_COLORS[status] || "default";
  const positionLabel = POSITION_LABELS[player.position] || player.position;

  // Accessibility: Create aria-label for player card
  const ariaLabel = `${player.name}, ${ROLE_LABELS[player.role] || player.role}, ${statusLabel}${
    player.number > 0 ? `, 球號 ${player.number}` : ""
  }${positionLabel ? `, 位置 ${positionLabel}` : ""}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div
          className="flex items-start justify-between"
          role="region"
          aria-label={ariaLabel}
        >
          <div className="flex-1">
            <CardTitle className="text-lg">{player.name}</CardTitle>
            <CardDescription className="mt-1">
              {player.number > 0 && `球號: ${player.number}`}
              {player.number > 0 && positionLabel && " • "}
              {positionLabel}
            </CardDescription>
          </div>
          <div className="flex gap-2" role="group" aria-label="球員狀態">
            <Badge variant={statusColor} aria-label={`狀態: ${statusLabel}`}>
              {statusLabel}
            </Badge>
            <Badge
              variant="secondary"
              aria-label={`角色: ${ROLE_LABELS[player.role] || player.role}`}
            >
              {ROLE_LABELS[player.role] || player.role}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Player Info */}
          <div className="space-y-1 text-sm">
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
          <div
            className="flex flex-wrap gap-2 border-t pt-2"
            role="group"
            aria-label={`${player.name} 的操作`}
          >
            {/* Edit Action */}
            {canManage && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(player)}
                disabled={isLoading}
                aria-label={`編輯球員 ${player.name}`}
              >
                編輯
              </Button>
            )}

            {/* Promote to Admin */}
            {canManage && onPromote && player.role === "MEMBER" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPromote(player._id)}
                disabled={isLoading}
                aria-label={`將 ${player.name} 升級為管理員`}
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
                aria-label={`從隊伍中移除 ${player.name}`}
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
                aria-label="離開當前隊伍"
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
                aria-label={`永久刪除球員 ${player.name}`}
              >
                刪除球員
              </Button>
            )}

            {/* Cancel Invitation - T100 US7 */}
            {canManage && onCancelInvitation && status === "INVITED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelInvitation(player._id)}
                disabled={isLoading}
                aria-label={`取消對 ${player.name} 的邀請`}
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
