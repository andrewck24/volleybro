"use client";
import { GameCourt } from "@/components/game/court";
import { GamePanel } from "@/components/game/panel";
import { useSubmitEntryDraft } from "@/components/game/panel/moves/oppo";
import { GamePreview } from "@/components/game/preview";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiArrowLeftSLine } from "react-icons/ri";

export const EntriesEdit = ({
  gameId,
  writing,
  onBack,
}: {
  gameId: string;
  writing: boolean;
  onBack: () => void;
}) => {
  const submitEntryDraft = useSubmitEntryDraft(gameId, "editing");

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <Button
            variant="glass"
            size="icon"
            disabled={writing}
            onClick={onBack}
          >
            <RiArrowLeftSLine />
            <span className="sr-only">back</span>
          </Button>
          編輯逐球紀錄
        </DialogTitle>
        <DialogDescription srOnly>逐球紀錄編輯頁面</DialogDescription>
      </DialogHeader>
      <GameCourt gameId={gameId} mode="editing" />
      <GamePreview
        gameId={gameId}
        mode="editing"
        onSubmit={submitEntryDraft}
        className="px-0 py-1 shadow-none"
      />
      <GamePanel gameId={gameId} mode="editing" className="p-0 shadow-none" />
    </>
  );
};
