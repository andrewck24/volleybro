"use client";

import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Item, ItemContent, ItemGroup } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayer } from "@/hooks/use-data";
import { POSITION_LABELS, ROLE_LABELS } from "@/lib/constants/labels";
import { FiEdit2, FiUser } from "react-icons/fi";

export function PlayerInfo({ teamId, playerId }: PlayerInfoProps) {
  const { player, isLoading, error, mutate } = usePlayer(playerId);

  const positionLabel = player?.position
    ? POSITION_LABELS[player?.position]
    : undefined;
  const roleLabel = player?.role ? ROLE_LABELS[player?.role] : undefined;

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

  return (
    <Card className="py-8">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border">
          <FiUser className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-xl font-bold">{player.name}</h2>
          <div className="flex gap-2">
            {roleLabel && <Badge variant="secondary">{roleLabel}</Badge>}
          </div>
        </div>
      </CardHeader>

      <ItemGroup>
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
      </ItemGroup>

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
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Skeleton className="my-1 h-6 w-32" />
          <Skeleton className="h-6 w-13" /> {/* badge */}
        </div>
      </CardHeader>
      <ItemGroup>
        {[
          { label: "w-12", value: "w-16" },
          { label: "w-12", value: "w-20" },
          { label: "w-16", value: "w-36" },
        ].map((widths, i) => (
          <Item key={i} className="hover:bg-transparent">
            <ItemContent>
              <Skeleton className={`my-0.5 h-4 ${widths.label}`} />
            </ItemContent>
            <Skeleton className={`my-0.5 h-4 ${widths.value}`} />
          </Item>
        ))}
      </ItemGroup>
      <Skeleton className="h-9 w-full" /> {/* edit button */}
    </Card>
  );
}
