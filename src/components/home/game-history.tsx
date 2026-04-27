"use client";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { GuidesForNewUser } from "@/components/custom/guides/new-user";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemFooter,
  ItemGroup,
  ItemHeader,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { useGameSummaries } from "@/hooks/use-data";
import type { GameSummaryView } from "@/lib/features/game/types";
import { format } from "date-fns";
import Link from "next/link";
import { Ref, useEffect, useRef } from "react";
import { RiArrowRightWideLine, RiGroupLine } from "react-icons/ri";

interface GameHistoryProps {
  teamId: string | undefined;
  isLoading: boolean;
  refreshError: unknown | null;
}

export function GameHistory({
  teamId,
  isLoading: teamIdLoading,
  refreshError,
}: GameHistoryProps) {
  const {
    gameSummaries,
    mutate,
    isLoading: summariesLoading,
    error,
    isReachingEnd,
    isLoadingMore,
    setSize,
  } = useGameSummaries(teamId);

  const isLoading = teamIdLoading || summariesLoading;
  const hasData = !!gameSummaries.length;

  const lastItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isReachingEnd && !isLoadingMore) {
          setSize((prev) => prev + 1);
        }
      },
      { threshold: 1 },
    );

    const currentElement = lastItemRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [isLoading, isReachingEnd, isLoadingMore, setSize, gameSummaries.length]);

  if (isLoading && !hasData) return <GameHistorySkeleton />;
  if (!hasData && (error || refreshError))
    return <ServerErrorState onRetry={() => mutate()} />;
  if (!teamId && !isLoading) return <GuidesForNewUser />;
  if (!hasData) return <NoMatches />;
  return (
    <ItemGroup>
      {gameSummaries.map((match, index) => (
        <Match
          key={match.id}
          match={match}
          ref={index === gameSummaries.length - 1 ? lastItemRef : null}
        />
      ))}
      {isLoadingMore && <MatchSkeleton />}
    </ItemGroup>
  );
}

interface MatchProps extends React.HTMLAttributes<HTMLDivElement> {
  match: GameSummaryView;
  ref?: Ref<HTMLDivElement>;
}

function Match({ match, ref, ...props }: MatchProps) {
  return (
    <Item
      ref={ref}
      data-slot="match"
      className="flex flex-col gap-2 bg-card px-4 py-2"
      asChild
      {...props}
    >
      <Link href={`/game/${match.id}`}>
        <ItemHeader className="flex w-full flex-row items-center justify-center gap-2">
          <span className="flex-1">{match.info.name || "Regular Game"}</span>
          <span>
            {match.info.time?.date
              ? format(new Date(match.info.time.date), "MMM. dd")
              : "no date"}
          </span>
        </ItemHeader>
        <ItemContent className="w-full text-xl">
          <TeamInfo team={match.teams.home} isHome />
          <TeamInfo team={match.teams.away} isHome={false} />
        </ItemContent>
        <ItemFooter className="flex w-full flex-row items-center justify-end text-muted-foreground">
          查看比賽
          <RiArrowRightWideLine />
        </ItemFooter>
      </Link>
    </Item>
  );
}

function TeamInfo({
  team,
  isHome,
}: {
  team: GameSummaryView["teams"]["home"];
  isHome: boolean;
}) {
  return (
    <div className="flex flex-row items-center justify-start">
      <span className="flex flex-1 flex-row items-center gap-2">
        <RiGroupLine />
        {isHome ? team.name || "我方" : team.name || "對手"}
      </span>
      <div className="flex flex-none flex-row items-center gap-2">
        <span className="text-3xl font-medium">{team.sets}</span>
        {team.scores.map(
          (score, index) =>
            score && (
              <span
                key={index}
                className="flex w-4 items-center justify-center text-lg"
              >
                {score}
              </span>
            ),
        )}
      </div>
    </div>
  );
}

function GameHistorySkeleton() {
  return (
    <ItemGroup>
      {Array.from({ length: 6 }, (_, i) => (
        <MatchSkeleton key={i} />
      ))}
    </ItemGroup>
  );
}

function MatchSkeleton() {
  return (
    <Item className="w-full gap-2 bg-card px-4 py-2">
      <ItemHeader className="flex w-full flex-row">
        <Skeleton className="mr-auto h-5 w-28 rounded-md" />
        <Skeleton className="h-5 w-28 rounded-md" />
      </ItemHeader>
      <ItemContent className="w-full text-xl">
        <div className="flex flex-row gap-2">
          <Skeleton className="my-1 size-6" />
          <Skeleton className="my-1 mr-auto h-6 w-32" />
          <Skeleton className="my-1 h-7 w-32" />
        </div>
        <div className="flex flex-row gap-2">
          <Skeleton className="my-1 size-6" />
          <Skeleton className="my-1 mr-auto h-6 w-32" />
          <Skeleton className="my-1 h-7 w-32" />
        </div>
      </ItemContent>
      <ItemFooter className="flex w-full flex-row items-center justify-end">
        <Skeleton className="h-5 w-24 rounded-md" />
      </ItemFooter>
    </Item>
  );
}

function NoMatches() {
  return (
    <Empty className="border border-dashed">
      <EmptyMedia variant="icon">
        <RiGroupLine />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>沒有比賽</EmptyTitle>
        <EmptyDescription>開始記錄你的第一場比賽吧！</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
