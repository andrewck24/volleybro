"use client";

import type { ReactNode } from "react";
import { RiGroupLine } from "react-icons/ri";

import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeam } from "@/hooks/use-data";

interface TeamItemProps {
  teamId: string;
  children?: ReactNode;
}

export function TeamItem({ teamId, children }: TeamItemProps) {
  const { team, isLoading } = useTeam(teamId);

  return (
    <>
      <ItemMedia variant="icon">
        <RiGroupLine className="h-4 w-4" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {isLoading ? (
            <span
              data-testid="team-name-skeleton"
              className="inline-block h-4 w-24 animate-pulse rounded bg-muted"
            />
          ) : (
            team?.name
          )}
        </ItemTitle>
        {children}
      </ItemContent>
    </>
  );
}

export function TeamItemSkeleton() {
  return (
    <Item>
      <ItemMedia variant="icon" data-testid="team-item-skeleton-media">
        <Skeleton className="h-4 w-4" />
      </ItemMedia>
      <ItemContent data-testid="team-item-skeleton-content">
        <Skeleton className="h-4 w-24" />
      </ItemContent>
    </Item>
  );
}
