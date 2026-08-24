"use client";
import { LoadingCourt } from "@/components/custom/court";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { GameCourt } from "@/components/game/court";
import { GameHeader } from "@/components/game/header";
import { GameOptions } from "@/components/game/options";
import { GameOptionsSummary } from "@/components/game/options/summary";
import { GamePanel } from "@/components/game/panel";
import { useSubmitEntryDraft } from "@/components/game/panel/moves/oppo";
import { SetOptions } from "@/components/game/set-options";
import { StatsForOneSet } from "@/components/game/stats";
import {
  SummaryDrawer,
  type SummaryDrawerState,
} from "@/components/game/summary-drawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGame } from "@/hooks/use-data";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEffect, useState } from "react";

const Game = ({ gameId, setIndex }: { gameId: string; setIndex: number }) => {
  const { game, isLoading, error, mutate } = useGame(gameId);
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState("overview");
  const [drawerState, setDrawerState] = useState<SummaryDrawerState>("idle");
  const { id, general } = useAppSelector((state) => state.game);
  const submitEntryDraft = useSubmitEntryDraft(gameId);
  const { flush } = usePendingWrites(gameId, setIndex);

  // Same mechanism as SyncIndicator's retry: there is no per-row retry of
  // its own, only the queue's.
  const handleEntryRetry = () => {
    dispatch(pendingWritesActions.retryRequested());
    void flush();
  };

  const handleOptionOpen = (tabValue: string) => {
    dispatch(gameActions.initialize({ game: game!, setIndex }));
    setTabValue(tabValue);
    setDialogOpen(true);
  };

  const toggleDrawer = () =>
    setDrawerState((s) => (s === "idle" ? "expanded" : "idle"));

  useEffect(() => {
    if (game) dispatch(gameActions.initialize({ game, setIndex }));
  }, [gameId, setIndex, game, dispatch]);

  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || id !== gameId) {
    return <GameSkeleton />;
  }

  if (!general.status.isSetInProgress) {
    return <Interval gameId={gameId} setIndex={setIndex} />;
  }

  return (
    <div className="flex h-full w-full max-w-160 flex-col items-center justify-start overflow-hidden">
      <GameHeader gameId={gameId} handleOptionOpen={handleOptionOpen} />
      {/* One viewport-height flex column: the fixed header's height is reserved
          once via pt, then court (fixed aspect) and panel (remaining height)
          fill the rest. The drawer is a vaul snap-point sheet portalled to
          <body> (fixed at the bottom), so pb reserves its idle peek height and
          the panel content never sits behind the peek. */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-1 pt-[calc(env(safe-area-inset-top)+5.75rem)] pb-21">
        <div className="w-full shrink-0 overflow-hidden rounded-lg">
          <GameCourt gameId={gameId} mode="general" />
        </div>
        <GamePanel gameId={gameId} mode="general" className="min-h-0 flex-1" />
      </div>
      <SummaryDrawer
        gameId={gameId}
        state={drawerState}
        onToggle={toggleDrawer}
        onSubmit={submitEntryDraft}
        onEditRequest={() => setDialogOpen(true)}
        onEntryRetry={handleEntryRetry}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <GameOptions
          gameId={gameId}
          tabValue={tabValue}
          setTabValue={setTabValue}
        />
      </Dialog>
    </div>
  );
};

export function GameSkeleton() {
  // Mirror the ready Game layout exactly (viewport-height column, fixed header
  // reserved once via pt, court / panel / drawer-peek) so there is no jump on
  // load: same header height, the court is not hidden behind the header, and
  // the drawer peek is present.
  return (
    <div className="flex h-full w-full max-w-160 flex-col items-center justify-start overflow-hidden">
      <GameHeader />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-1 pt-[calc(env(safe-area-inset-top)+5.75rem)] pb-21">
        <div className="w-full shrink-0 overflow-hidden rounded-lg">
          <LoadingCourt />
        </div>
        {/* mirrors GamePanel: progress bar + caption + moves grid, on bg-card */}
        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-hidden rounded-lg bg-card px-2 py-2">
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-4 w-40" />
          <div className="grid w-full flex-1 grid-cols-2 gap-2 pt-1">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-full min-h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
      {/* mirrors the drawer idle peek fixed at the viewport bottom: handle +
          one entry-row-shaped skeleton on the drawer (bg-card) surface. Height
          is pinned to PEEK_SNAP (80px = h-20) so the peek's top edge lands where
          the real drawer sits and the ~20px breathing room below the row matches
          -- no gap above the peek and no jump when the real drawer mounts. */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto h-20 w-full max-w-160 rounded-t-[10px] bg-card">
        <div className="pt-2 pb-1.5">
          <Skeleton className="mx-auto h-1.5 w-10 rounded-full" />
        </div>
        <div className="grid w-full px-2">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

const Interval = ({
  gameId,
  setIndex,
}: {
  gameId: string;
  setIndex: number;
}) => {
  const { game } = useGame(gameId);
  // SetOptions only treats `sets.length` as a new set, and the viewed set is
  // not always the last one.
  const nextSetIndex = game?.sets.length ?? setIndex + 1;

  return (
    <>
      <GameHeader gameId={gameId} />
      <Accordion
        type="single"
        defaultValue="stats"
        collapsible
        className="w-full pb-[calc(env(safe-area-inset-bottom)+5.5rem)]"
      >
        <AccordionItem value="stats" className="w-full bg-card">
          <AccordionTrigger className="w-full p-4">數據統計</AccordionTrigger>
          <AccordionContent className="flex w-full flex-col items-center justify-center gap-4">
            <StatsForOneSet gameId={gameId} setIndex={setIndex} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="summary" className="w-full bg-card">
          <AccordionTrigger className="w-full p-4">逐球紀錄</AccordionTrigger>
          <AccordionContent className="h-full w-full px-4">
            <GameOptionsSummary gameId={gameId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] w-full px-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full">
              新的一局
            </Button>
          </DialogTrigger>
          <SetOptions gameId={gameId} setIndex={nextSetIndex} />
        </Dialog>
      </div>
    </>
  );
};

export default Game;
