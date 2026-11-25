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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { suppressLeaveWarning } from "@/hooks/use-leave-page-warning";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiExpandDiagonalLine } from "react-icons/ri";

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
        <DialogContent size="lg">
          <DialogHeader
            trailing={
              <Button
                type="button"
                variant="glass"
                size="icon"
                aria-label="全頁模式"
                onClick={() => {
                  suppressLeaveWarning();
                  window.location.replace(fullPageHref);
                }}
              >
                <RiExpandDiagonalLine />
              </Button>
            }
          >
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription srOnly>{title}表單</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscard} onOpenChange={setShowDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放棄變更？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            <AlertDialogDescription>
              您有未儲存的變更，關閉後將會遺失。
            </AlertDialogDescription>
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel>繼續編輯</AlertDialogCancel>
            <AlertDialogAction
              variant="outline-destructive"
              onClick={handleDiscard}
            >
              放棄變更
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
