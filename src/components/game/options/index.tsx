"use client";
import { GameOptionsOverview } from "@/components/game/options/overview";
import {
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const GameOptions = ({
  gameId,
  tabValue,
  setTabValue,
}: {
  gameId: string;
  tabValue: string;
  setTabValue: (value: string) => void;
}) => {
  return (
    <DialogContent size="lg">
      <DialogHeader>
        <DialogTitle>
          {tabValue === "overview" && "數據總覽"}
          {tabValue === "settings" && "賽事資訊與設定"}
        </DialogTitle>
        <DialogDescription srOnly>Options</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">總覽</TabsTrigger>
            <TabsTrigger value="settings">設定</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="flex-1">
            <GameOptionsOverview gameId={gameId} />
          </TabsContent>
          <TabsContent value="settings" className="flex-1">
            <div>設定</div>
          </TabsContent>
        </Tabs>
      </DialogBody>
    </DialogContent>
  );
};
