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
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { suppressLeaveWarning } from "@/hooks/use-leave-page-warning";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiCloseLine, RiExpandDiagonalLine } from "react-icons/ri";

interface EditDialogContainerProps {
  title: string;
  fullPageHref: string;
  isDirty: boolean;
  clearDraft: () => void;
  children: React.ReactNode;
}

export function EditDialogContainer({
  title,
  fullPageHref,
  isDirty,
  clearDraft,
  children,
}: EditDialogContainerProps) {
  const router = useRouter();
  const [showDiscard, setShowDiscard] = useState(false);

  const handleClose = () => {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      router.back();
    }
  };

  const handleDiscard = () => {
    clearDraft();
    setShowDiscard(false);
    router.back();
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent
          size="lg"
          closeButton={false}
          aria-describedby={undefined}
          className="px-0 pb-0"
        >
          <DialogHeader className="flex-row items-center justify-between bg-card px-4 pt-[env(safe-area-inset-top)]">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => {
                  suppressLeaveWarning();
                  window.location.assign(fullPageHref);
                }}
                aria-label="全頁模式"
              >
                <RiExpandDiagonalLine className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={handleClose}
                aria-label="關閉"
              >
                <RiCloseLine className="size-4" />
              </Button>
            </div>
          </DialogHeader>
          <div
            className="flex-1 overflow-y-auto px-4 pb-4"
            data-testid="dialog-scroll-container"
          >
            {children}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscard} onOpenChange={setShowDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放棄變更？</AlertDialogTitle>
            <AlertDialogDescription>
              您有未儲存的變更，關閉後將會遺失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>繼續編輯</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>
              放棄變更
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
