"use client";

import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Item, ItemContent } from "@/components/ui/item";
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
      <Empty>
        <EmptyMedia variant="icon">
          <FiUser />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>找不到球員</EmptyTitle>
        </EmptyHeader>
      </Empty>
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
        <Item>
          <ItemContent>
            <span className="text-sm text-muted-foreground">背號</span>
          </ItemContent>
          <span className="text-sm font-medium">
            {player.number != null ? `#${player.number}` : undefined}
          </span>
        </Item>
        <Item>
          <ItemContent>
            <span className="text-sm text-muted-foreground">位置</span>
          </ItemContent>
          <span className="text-sm font-medium">{positionLabel}</span>
        </Item>
        <Item>
          <ItemContent>
            <span className="text-sm text-muted-foreground">電子郵件</span>
          </ItemContent>
          <span className="text-sm font-medium">{player.email}</span>
        </Item>
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
        <div className="min-w-0 flex-1">
          <Skeleton className="my-1 h-6 w-32" /> {/* name: text-xl glyph h-6, my-1 leading */}
          <div className="mt-1 flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" /> {/* badge */}
          </div>
        </div>
      </div>
      <div className="divide-y">
        <Item>
          <ItemContent>
            <Skeleton className="my-0.5 h-4 w-12" /> {/* label: text-sm */}
          </ItemContent>
          <Skeleton className="my-0.5 h-4 w-16" /> {/* value */}
        </Item>
        <Item>
          <ItemContent>
            <Skeleton className="my-0.5 h-4 w-12" />
          </ItemContent>
          <Skeleton className="my-0.5 h-4 w-20" />
        </Item>
        <Item>
          <ItemContent>
            <Skeleton className="my-0.5 h-4 w-16" />
          </ItemContent>
          <Skeleton className="my-0.5 h-4 w-36" />
        </Item>
      </div>
      <Skeleton className="h-10 w-full" /> {/* edit button */}
    </Card>
  );
}

