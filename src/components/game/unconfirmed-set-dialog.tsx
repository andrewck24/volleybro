"use client";
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
import { useUnconfirmedSetCompletion } from "@/hooks/use-unconfirmed-set-completion";
import { RiAlertLine } from "react-icons/ri";

const ATTEMPTING_TITLE = "正在記錄本局結果…";
const ATTEMPTING_DESCRIPTION = "完成前請先不要開始下一局。";
// Mirrors the shared error toast helper's branded server-error wording
// (src/lib/api/error-toast.ts) so the voice is consistent everywhere the
// recorder sees an unrecoverable write.
const EXHAUSTED_TITLE = "哎呀，發球掛網了！";
const EXHAUSTED_DESCRIPTION = "本局結果還沒存好，這一局的球都在，只差這一步。";

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
  const { unconfirmed, attempting, retry } = useUnconfirmedSetCompletion(
    gameId,
    setIndex,
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
              <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            {!attempting && (
              <EmptyContent>
                <Button onClick={() => void retry()}>重試</Button>
              </EmptyContent>
            )}
          </Empty>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
