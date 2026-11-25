"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBackConfirmation } from "@/hooks/use-back-confirmation";
import { useLeavePageWarning } from "@/hooks/use-leave-page-warning";
import { useUnconfirmedSetCompletion } from "@/hooks/use-unconfirmed-set-completion";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { RiAlertLine } from "react-icons/ri";

import { ERROR_MESSAGES } from "@/lib/api/error-messages";

const ATTEMPTING_TITLE = "正在記錄本局結果…";
const ATTEMPTING_DESCRIPTION = "正在儲存本局結果，請稍候。";
const EXHAUSTED_TITLE = ERROR_MESSAGES.SERVER_ERROR.title;
const EXHAUSTED_DESCRIPTION = "本局結果還沒存好，這一局的球都在，只差這一步。";
const LEAVE_TITLE = "本局結果還沒存好";
const LEAVE_DESCRIPTION =
  "現在離開，這一局的結果仍然沒有送出。回到這場比賽就能再試一次。";

export const UnconfirmedSetDialog = ({
  gameId,
  setIndex,
}: {
  gameId: string;
  setIndex: number;
}) => {
  const router = useRouter();
  const { unconfirmed, attempting, retry } = useUnconfirmedSetCompletion(
    gameId,
    setIndex,
  );
  const leave = useCallback(
    () => router.push(`/game/${gameId}`),
    [router, gameId],
  );
  const { confirming, confirmLeave, cancelLeave } = useBackConfirmation(
    unconfirmed,
    leave,
  );
  useLeavePageWarning(unconfirmed);
  const title = attempting ? ATTEMPTING_TITLE : EXHAUSTED_TITLE;
  const description = attempting
    ? ATTEMPTING_DESCRIPTION
    : EXHAUSTED_DESCRIPTION;

  return (
    <AlertDialog open={unconfirmed}>
      <AlertDialogContent
        className="outline-none"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogBody className="flex-row items-center gap-2">
          {attempting ? (
            <Spinner role="status" aria-label="處理中" />
          ) : (
            <RiAlertLine className="size-5 shrink-0 text-error-text" />
          )}
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogBody>
        {!attempting && (
          <AlertDialogFooter>
            <Button onClick={() => void retry()}>重試</Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
      <AlertDialog
        open={confirming}
        onOpenChange={(open) => !open && cancelLeave()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{LEAVE_TITLE}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            <AlertDialogDescription>{LEAVE_DESCRIPTION}</AlertDialogDescription>
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>
              留在這裡
            </AlertDialogCancel>
            <AlertDialogAction
              variant="outline-destructive"
              onClick={confirmLeave}
            >
              仍要離開
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertDialog>
  );
};
