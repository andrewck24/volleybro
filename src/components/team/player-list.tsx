"use client";

import { PlayerCard } from "@/components/team/player-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Player } from "@/entities/player";
import { getPlayerStatus } from "@/entities/player";
import { POSITION_LABELS, STATUS_LABELS } from "@/lib/constants/labels";
import { useMemo, useState } from "react";

interface PlayerListProps {
  players: Player[];
  isOwner?: boolean;
  canManage?: boolean;
  currentUserId?: string;
  isLoading?: boolean;
  onEdit?: (player: Player) => void;
  onRemove?: (playerId: string) => void;
  onPromote?: (playerId: string) => void;
  onLeave?: (playerId: string) => void;
  onDelete?: (playerId: string) => void;
  onCancelInvitation?: (playerId: string) => void;
}

// T125: Position filter options (using centralized labels)
const POSITION_FILTERS = [
  { value: "", label: "所有位置" },
  { value: "OH", label: POSITION_LABELS["OH"] },
  { value: "MB", label: POSITION_LABELS["MB"] },
  { value: "OP", label: POSITION_LABELS["OP"] },
  { value: "S", label: POSITION_LABELS["S"] },
  { value: "L", label: POSITION_LABELS["L"] },
];

// T125: Status filter options (using centralized labels)
const STATUS_FILTERS = [
  { value: "", label: "所有狀態" },
  { value: "JOINED", label: STATUS_LABELS["JOINED"] },
  { value: "INVITED", label: STATUS_LABELS["INVITED"] },
  { value: "PURE_PLAYER", label: STATUS_LABELS["PURE_PLAYER"] },
];

/**
 * T055 [US3] PlayerList - 球員列表元件，含篩選功能
 * 用於顯示隊伍中所有球員，支援按位置和狀態篩選
 */
export function PlayerList({
  players,
  isOwner = false,
  canManage = false,
  currentUserId,
  isLoading = false,
  onEdit,
  onRemove,
  onPromote,
  onLeave,
  onDelete,
  onCancelInvitation,
}: PlayerListProps) {
  const [searchText, setSearchText] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Filter and search players
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Search by name
      if (
        searchText &&
        !player.name.toLowerCase().includes(searchText.toLowerCase())
      ) {
        return false;
      }

      // Filter by position
      if (positionFilter && player.position !== positionFilter) {
        return false;
      }

      // Filter by status
      if (statusFilter && getPlayerStatus(player) !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [players, searchText, positionFilter, statusFilter]);

  // Group players by status
  const groupedPlayers = useMemo(() => {
    const grouped: Record<string, Player[]> = {
      JOINED: [],
      INVITED: [],
      PURE_PLAYER: [],
    };

    filteredPlayers.forEach((player) => {
      const status = getPlayerStatus(player);
      if (status in grouped) {
        grouped[status].push(player);
      }
    });

    return grouped;
  }, [filteredPlayers]);

  const totalCount = filteredPlayers.length;
  const joinedCount = groupedPlayers.JOINED.length;
  const invitedCount = groupedPlayers.INVITED.length;
  const pureCount = groupedPlayers.PURE_PLAYER.length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>篩選球員</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">搜尋名稱</Label>
              <Input
                id="search"
                placeholder="輸入球員名稱"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Position Filter */}
            <div className="space-y-2">
              <Label htmlFor="position">位置</Label>
              <select
                id="position"
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                {POSITION_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">狀態</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                {STATUS_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear filters button */}
          {(searchText || positionFilter || statusFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchText("");
                setPositionFilter("");
                setStatusFilter("");
              }}
              disabled={isLoading}
            >
              清除篩選
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle>隊伍成員</CardTitle>
          <CardDescription>
            共 {totalCount} 位球員
            {joinedCount > 0 && ` (已加入: ${joinedCount})`}
            {invitedCount > 0 && ` (待決: ${invitedCount})`}
            {pureCount > 0 && ` (純球員: ${pureCount})`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Players Grid */}
      {totalCount === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              {players.length === 0 ? "暫無球員記錄" : "沒有符合篩選條件的球員"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player._id}
              player={player}
              isOwner={isOwner && player.role === "OWNER"}
              canManage={canManage}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onRemove={onRemove}
              onPromote={onPromote}
              onLeave={onLeave}
              onDelete={onDelete}
              onCancelInvitation={onCancelInvitation}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
