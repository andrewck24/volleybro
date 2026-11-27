"use client";
import { GameCourt } from "@/components/game/court";
import { GamePanel } from "@/components/game/panel";
import { useSubmitEntryDraft } from "@/components/game/panel/moves/oppo";
import { GamePreview } from "@/components/game/preview";
import {
  DialogCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const EntriesEdit = ({
  gameId,
  writing,
}: {
  gameId: string;
  writing: boolean;
}) => {
  const submitEntryDraft = useSubmitEntryDraft(gameId, "editing");

  return (
    <>
      <DialogHeader leading={<DialogCloseButton disabled={writing} />}>
        <DialogTitle>編輯逐球紀錄</DialogTitle>
        <DialogDescription srOnly>逐球紀錄編輯頁面</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <GameCourt gameId={gameId} mode="editing" />
        <GamePanel gameId={gameId} mode="editing" className="pb-0" />
        <DialogFooter className="shrink-0 pt-0">
          <GamePreview
            gameId={gameId}
            mode="editing"
            onSubmit={submitEntryDraft}
          />
        </DialogFooter>
      </div>
    </>
  );
};
