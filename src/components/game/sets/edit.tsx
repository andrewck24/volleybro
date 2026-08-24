"use client";
import { EntriesEdit } from "@/components/game/options/edit";
import { GameOptionsSummary } from "@/components/game/options/summary";
import {
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditingGuard } from "@/hooks/use-editing-guard";
import { useAppSelector } from "@/lib/redux/hooks";

export const SetEdit = ({
  gameId,
  setIndex,
}: {
  gameId: string;
  setIndex: number;
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
      {mode === "general" ? (
        <>
          <DialogHeader>
            <DialogTitle>第 {setIndex + 1} 局逐球記錄</DialogTitle>
            <DialogDescription srOnly>逐球紀錄頁面</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <GameOptionsSummary gameId={gameId} />
          </DialogBody>
        </>
      ) : (
        <EntriesEdit gameId={gameId} />
      )}
    </DialogContent>
  );
};
