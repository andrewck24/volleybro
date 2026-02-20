"use client";

import { Link } from "@/components/ui/button";
import type { Player } from "@/entities/player";
import { POSITION_LABELS } from "@/lib/constants/labels";
import { FiUser } from "react-icons/fi";

interface ListItemProps {
  player: Player;
  teamId: string;
}

export function ListItem({ player, teamId }: ListItemProps) {
  const positionLabel = player.position
    ? POSITION_LABELS[player.position]
    : undefined;

  return (
    <Link
      variant="ghost"
      size="wide"
      className="h-12"
      aria-label={`${player.name}${player.number ? `-#${player.number}` : ""}${positionLabel ? `-${positionLabel}` : ""}`}
      href={`/team/${teamId}/players/${player._id}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border">
        <FiUser className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-medium">{player.name}</span>
        {player.number && (
          <span className="shrink-0 text-sm text-muted-foreground">
            #{player.number}
          </span>
        )}
      </div>
      {positionLabel && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {positionLabel}
        </span>
      )}
    </Link>
  );
}
