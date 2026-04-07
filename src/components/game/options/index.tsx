"use client";
import { EntriesEdit } from "@/components/game/options/edit";
import { GameOptionsOverview } from "@/components/game/options/overview";
import { GameOptionsSummary } from "@/components/game/options/summary";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gameActions } from "@/lib/features/game/game-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

export const GameOptions = ({
  gameId,
  tabValue,
  setTabValue,
}: {
  gameId: string;
  tabValue: string;
  setTabValue: (value: string) => void;
}) => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((state) => state.game);

  return (
    <DialogContent
      size="lg"
      closeButton={mode === "general"}
      onCloseAutoFocus={() => dispatch(gameActions.setGameMode("general"))}
    >
      {mode === "editing" ? (
        <EntriesEdit gameId={gameId} />
      ) : (
        <>
          <DialogHeader>
            <DialogTitle>
              {tabValue === "overview" && "數據總覽"}
              {tabValue === "summary" && "逐球紀錄"}
              {tabValue === "settings" && "賽事資訊與設定"}
            </DialogTitle>
            <DialogDescription className="sr-only">Options</DialogDescription>
          </DialogHeader>
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">總覽</TabsTrigger>
              <TabsTrigger value="summary">紀錄</TabsTrigger>
              <TabsTrigger value="settings">設定</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="flex-1">
              <GameOptionsOverview gameId={gameId} />
            </TabsContent>
            <TabsContent value="summary" className="h-full flex-1">
              <GameOptionsSummary gameId={gameId} />
            </TabsContent>
            <TabsContent value="settings" className="flex-1">
              <div>設定</div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DialogContent>
  );
};
