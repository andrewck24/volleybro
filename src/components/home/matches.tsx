"use client";
import { useCallback, useEffect, useRef } from "react";
import { useUser, useMatches } from "@/hooks/use-data";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { MatchResult } from "@/components/record/match";
import { Skeleton } from "@/components/ui/skeleton";

export function MatchesSkeleton() {
  return (
    <div className="w-full space-y-2">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-md" />
      ))}
    </div>
  );
}

export const TeamMatches = ({ teamId }: { teamId: string }) => {
  const { mutate: mutateUser } = useUser();
  const {
    matches,
    mutate: mutateTeamRecords,
    isLoading,
    isReachingEnd,
    isLoadingMore,
    setSize,
  } = useMatches(teamId);

  const mutate = useCallback(() => {
    mutateUser();
    mutateTeamRecords();
  }, [mutateUser, mutateTeamRecords]);

  usePullToRefresh(mutate);

  const lastItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isReachingEnd && !isLoadingMore) {
          setSize((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    const currentElement = lastItemRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [isLoading, isReachingEnd, isLoadingMore, setSize, matches?.length]);

  if (isLoading && !matches?.length) return <MatchesSkeleton />;

  return (
    <>
      {matches?.length ? (
        <>
          {matches.map((match, index) => {
            const isLastItem = index === matches.length - 1;
            return (
              <div key={match._id} ref={isLastItem ? lastItemRef : null}>
                <MatchResult match={match} />
              </div>
            );
          })}
          {isLoadingMore && <MatchesSkeleton />}
        </>
      ) : (
        <p>沒有比賽</p>
      )}
    </>
  );
};
