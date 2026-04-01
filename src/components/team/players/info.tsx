"use client";

import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Player } from "@/entities/player";
import { usePlayer } from "@/hooks/use-data";
import { POSITION_LABELS, ROLE_LABELS } from "@/lib/constants/labels";
import { FiEdit2, FiUser } from "react-icons/fi";

export function PlayerInfo({ teamId, playerId }: PlayerInfoProps) {
  const { player, isLoading, error, mutate } = usePlayer(playerId);

  if (isLoading) return <PlayerInfoSkeleton />;
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (!player)
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        找不到球員
      </div>
    );

  return <PlayerDetails player={player} teamId={teamId} />;
}

function PlayerDetails({ player, teamId }: { player: Player; teamId: string }) {
  const positionLabel = player.position
    ? POSITION_LABELS[player.position]
    : undefined;
  const roleLabel = player.role ? ROLE_LABELS[player.role] : undefined;

  return (
    <Card className="py-8">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border">
          <FiUser className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold">{player.name}</h2>
          <div className="mt-1 flex gap-2">
            {roleLabel && <Badge variant="secondary">{roleLabel}</Badge>}
          </div>
        </div>
      </div>

      <div className="divide-y">
        <InfoRow
          label="背號"
          value={player.number != null ? `#${player.number}` : undefined}
        />
        <InfoRow label="位置" value={positionLabel} />
        <InfoRow label="電子郵件" value={player.email} />
      </div>

      <Link
        variant="outline"
        className="w-full"
        href={`/team/${teamId}/players/${player._id}/edit`}
      >
        <FiEdit2 />
        編輯球員
      </Link>
    </Card>
  );
}

interface PlayerInfoProps {
  teamId: string;
  playerId: string;
}

export function PlayerInfoSkeleton() {
  return (
    <Card className="py-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex justify-between py-1.5">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
