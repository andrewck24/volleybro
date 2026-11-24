"use client";
import { EntriesEdit } from "@/components/game/options/edit";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEditingGuard } from "@/hooks/use-editing-guard";
import { useAppSelector } from "@/lib/redux/hooks";

export const EntriesEditDialog = ({ gameId }: { gameId: string }) => {
  const isEditing = useAppSelector((state) =>
    Boolean(state.game.editing.entryDraft.id),
  );
  const { writing, guardDismiss, leaveEditing } = useEditingGuard();

  return (
    <Dialog
      open={isEditing}
      onOpenChange={(open) => {
        if (!open) leaveEditing();
      }}
    >
      <DialogContent
        size="lg"
        onEscapeKeyDown={guardDismiss}
        onInteractOutside={guardDismiss}
      >
        <EntriesEdit gameId={gameId} writing={writing} onBack={leaveEditing} />
      </DialogContent>
    </Dialog>
  );
};
