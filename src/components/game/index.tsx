"use client";
import { LoadingCourt } from "@/components/custom/court";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { GameCourt } from "@/components/game/court";
import { GameHeader } from "@/components/game/header";
import { GameOptions } from "@/components/game/options";
import { GameOptionsSummary } from "@/components/game/options/summary";
import { GamePanel } from "@/components/game/panel";
import { GamePreview } from "@/components/game/preview";
import { SetOptions } from "@/components/game/set-options";
import { StatsForOneSet } from "@/components/game/stats";
import { SummaryDrawer } from "@/components/game/summary-drawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGame } from "@/hooks/use-data";
import { gameActions } from "@/lib/features/game/game-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEffect, useState } from "react";

const Game = ({ gameId, setIndex }: { gameId: string; setIndex: number }) => {
  const { game, isLoading, error, mutate } = useGame(gameId);
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState("overview");
  const { id, general } = useAppSelector((state) => state.game);

  const handleOptionOpen = (tabValue: string) => {
    dispatch(gameActions.initialize({ game: game!, setIndex }));
    setTabValue(tabValue);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (game) dispatch(gameActions.initialize({ game, setIndex }));
  }, [gameId, setIndex, game, dispatch]);

  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (isLoading || id !== gameId) {
    return <GameSkeleton />;
  }

  if (!general.status.inProgress) {
    return <Interval gameId={gameId} setIndex={setIndex} />;
  }

  return (
    <div className="flex size-full max-w-160 flex-col items-center justify-start gap-1 overflow-hidden">
      <GameHeader gameId={gameId} handleOptionOpen={handleOptionOpen} />
      <GameCourt gameId={gameId} mode="general" />
      <SummaryDrawer gameId={gameId} />
      <GamePreview
        gameId={gameId}
        mode="general"
        handleOptionOpen={handleOptionOpen}
      />
      <GamePanel
        gameId={gameId}
        mode="general"
        className="pb-[max(calc(env(safe-area-inset-bottom)-1rem),1.5rem)]"
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
  return (
    <div className="flex size-full max-w-160 flex-col items-center justify-start gap-1 overflow-hidden">
      <GameHeader />
      <LoadingCourt />
      {/* mirrors GamePreview: Card grid w-full p-2 */}
      <Card className="grid w-full p-2">
        <Skeleton className="h-8 w-full" />
      </Card>
      {/* mirrors GamePanel: Panel slot (bg-card flex-1) */}
      <div className="flex w-full flex-1 flex-col items-center justify-start gap-2 overflow-x-hidden bg-card">
        <Skeleton className="my-0.5 h-5 w-32" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
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
          <SetOptions gameId={gameId} setIndex={setIndex + 1} />
        </Dialog>
      </div>
    </>
  );
};

export default Game;
