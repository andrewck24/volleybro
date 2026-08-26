"use client";
import { EntriesEdit } from "@/components/game/options/edit";
import { GameOptionsOverview } from "@/components/game/options/overview";
import {
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditingGuard } from "@/hooks/use-editing-guard";
import { useAppSelector } from "@/lib/redux/hooks";

export const GameOptions = ({
  gameId,
  tabValue,
  setTabValue,
}: {
  gameId: string;
  tabValue: string;
  setTabValue: (value: string) => void;
}) => {
  const { mode } = useAppSelector((state) => state.game);
  const { guardDismiss, leaveEditing } = useEditingGuard();

  return (
    <DialogContent
      size="lg"
      closeButton={mode === "general"}
      onEscapeKeyDown={guardDismiss}
      onInteractOutside={guardDismiss}
      onCloseAutoFocus={leaveEditing}
    >
      {mode === "editing" ? (
        <EntriesEdit gameId={gameId} />
      ) : (
        <>
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
        </>
      )}
    </DialogContent>
  );
};
