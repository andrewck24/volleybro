"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useBackConfirmation } from "@/hooks/use-back-confirmation";
import { useUnconfirmedSetCompletion } from "@/hooks/use-unconfirmed-set-completion";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { RiAlertLine } from "react-icons/ri";

const ATTEMPTING_TITLE = "正在記錄本局結果…";
// Screen readers only: on screen the spinner and title already say this.
const ATTEMPTING_DESCRIPTION = "正在儲存本局結果，請稍候。";
// Mirrors the shared error toast helper's branded server-error wording
// (src/lib/api/error-toast.ts) so the voice is consistent everywhere the
// recorder sees an unrecoverable write.
const EXHAUSTED_TITLE = "哎呀，發球掛網了！";
const EXHAUSTED_DESCRIPTION = "本局結果還沒存好，這一局的球都在，只差這一步。";
const LEAVE_TITLE = "本局結果還沒存好";
const LEAVE_DESCRIPTION =
  "現在離開，這一局的結果仍然沒有送出。回到這場比賽就能再試一次。";

/**
 * The entry itself already landed by the time this can render -- the only
 * thing missing is the set result, so this blocks the between-sets screen
 * until it lands. No escape route: a dismissable surface here would let the
 * recorder start the next set on top of a result that was never saved.
 */
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
  // Blocking the dialog's own dismissals still leaves the back gesture, which
  // on a phone is the way out of anything.
  const leave = useCallback(
    () => router.push(`/game/${gameId}`),
    [router, gameId],
  );
  const { confirming, confirmLeave, cancelLeave } = useBackConfirmation(
    unconfirmed,
    leave,
  );
  const title = attempting ? ATTEMPTING_TITLE : EXHAUSTED_TITLE;
  const description = attempting
    ? ATTEMPTING_DESCRIPTION
    : EXHAUSTED_DESCRIPTION;

  return (
    <Dialog open={unconfirmed} onOpenChange={() => {}}>
      <DialogContent
        size="lg"
        closeButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle srOnly>{title}</DialogTitle>
        <DialogDescription srOnly>{description}</DialogDescription>
        <DialogBody className="items-center justify-center">
          <Empty>
            <EmptyMedia
              variant="icon"
              className={
                !attempting ? "bg-destructive/10 text-destructive" : undefined
              }
            >
              {attempting ? (
                <Spinner role="status" aria-label="處理中" />
              ) : (
                <RiAlertLine />
              )}
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{title}</EmptyTitle>
              {!attempting && (
                <EmptyDescription>{description}</EmptyDescription>
              )}
            </EmptyHeader>
            {!attempting && (
              <EmptyContent>
                <Button onClick={() => void retry()}>重試</Button>
              </EmptyContent>
            )}
          </Empty>
        </DialogBody>
      </DialogContent>
      <AlertDialog
        open={confirming}
        onOpenChange={(open) => !open && cancelLeave()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{LEAVE_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>{LEAVE_DESCRIPTION}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>
              留在這裡
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>
              仍要離開
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
