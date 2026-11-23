"use client";
import { EntriesEdit } from "@/components/game/options/edit";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEditingGuard } from "@/hooks/use-editing-guard";
import { useAppSelector } from "@/lib/redux/hooks";

export const EntriesEditDialog = ({ gameId }: { gameId: string }) => {
  const mode = useAppSelector((state) => state.game.mode);
  const { guardDismiss, leaveEditing } = useEditingGuard();

  return (
    <Dialog
      open={mode === "editing"}
      onOpenChange={(open) => {
        if (!open) leaveEditing();
      }}
    >
      <DialogContent
        size="lg"
        onEscapeKeyDown={guardDismiss}
        onInteractOutside={guardDismiss}
      >
        <EntriesEdit gameId={gameId} />
      </DialogContent>
    </Dialog>
  );
};
