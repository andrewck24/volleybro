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
  const isEditing = useAppSelector((state) =>
    Boolean(state.game.editing.entryDraft.id),
  );
  const { writing, guardDismiss, leaveEditing } = useEditingGuard();

  return (
    <DialogContent
      size="lg"
      onEscapeKeyDown={guardDismiss}
      onInteractOutside={guardDismiss}
      onCloseAutoFocus={leaveEditing}
    >
      {!isEditing ? (
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
        <EntriesEdit gameId={gameId} writing={writing} onBack={leaveEditing} />
      )}
    </DialogContent>
  );
};
