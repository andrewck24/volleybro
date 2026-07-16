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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { suppressLeaveWarning } from "@/hooks/use-leave-page-warning";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
          expandLabel="全頁模式"
          onExpand={() => {
            suppressLeaveWarning();
            window.location.assign(fullPageHref);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription srOnly>{title}表單</DialogDescription>
          </DialogHeader>
          <DialogBody data-testid="dialog-scroll-container">
            {children}
          </DialogBody>
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
