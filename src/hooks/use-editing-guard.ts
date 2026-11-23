"use client";
import { useToast } from "@/components/ui/use-toast";
import { gameActions } from "@/lib/features/game/game-slice";
import {
  hasFailedWrite,
  isPendingWrite,
} from "@/lib/features/game/pending-writes";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEffect, useRef } from "react";

export function useEditingGuard() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const mode = useAppSelector((state) => state.game.mode);
  const entryId = useAppSelector((state) => state.game.editing.entryDraft.id);
  const pendingWrites = useAppSelector((state) => state.pendingWrites);

  const queued = pendingWrites.pending.some((p) => p.entry.id === entryId);
  const wasQueued = useRef(false);

  useEffect(() => {
    if (mode !== "editing") {
      wasQueued.current = false;
      return;
    }
    if (queued) {
      wasQueued.current = true;
      return;
    }
    if (wasQueued.current) {
      wasQueued.current = false;
      dispatch(gameActions.setGameMode("general"));
    }
  }, [mode, queued, dispatch]);

  const writing = mode === "editing" && isPendingWrite(pendingWrites, entryId);
  const failed = mode === "editing" && hasFailedWrite(pendingWrites, entryId);

  const guardDismiss = (event: { preventDefault: () => void }) => {
    if (writing) event.preventDefault();
  };

  const leaveEditing = () => {
    if (writing) return;
    if (failed) {
      toast({
        title: "編輯未儲存",
        description: "這筆逐球紀錄的修改沒有送出成功，之後可以在紀錄列表重試。",
        variant: "error",
      });
    }
    dispatch(gameActions.setGameMode("general"));
  };

  return { writing, failed, guardDismiss, leaveEditing };
}
