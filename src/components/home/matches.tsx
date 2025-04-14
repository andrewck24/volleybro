"use client";
import { useEffect, useRef } from "react";
import { useUser, useMatches } from "@/hooks/use-data";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { MatchResult } from "@/components/record/match";
import LoadingCard from "@/components/custom/loading/card";

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

  const mutate = () => {
    mutateUser();
    mutateTeamRecords();
  };

  usePullToRefresh(mutate);

  // 設置無限滾動的觀察元素參考
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useRef<HTMLDivElement | null>(null);

  // 設置 Intersection Observer
  useEffect(() => {
    if (isLoading) return;

    const loadMoreItems = () => {
      if (!isReachingEnd && !isLoadingMore) {
        setSize((prev) => prev + 1);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems();
        }
      },
      { threshold: 1 } // 元素進入視圖10%時觸發
    );

    const currentElement = lastItemRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    observerRef.current = observer;

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
      observer.disconnect();
    };
  }, [isLoading, isReachingEnd, isLoadingMore, setSize, matches?.length]);

  if (isLoading && !matches?.length) return <LoadingCard className="w-full" />;

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
          {isLoadingMore && <LoadingCard className="w-full mt-2" />}
        </>
      ) : (
        <p>沒有比賽</p>
      )}
    </>
  );
};
