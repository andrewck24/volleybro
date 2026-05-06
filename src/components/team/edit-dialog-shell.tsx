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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiArrowRightUpLine, RiCloseLine } from "react-icons/ri";

interface EditDialogShellProps {
  title: string;
  fullPageHref: string;
  isDirty: boolean;
  clearDraft: () => void;
  children: React.ReactNode;
}

export function EditDialogShell({
  title,
  fullPageHref,
  isDirty,
  clearDraft,
  children,
}: EditDialogShellProps) {
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
      <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent size="lg" closeButton={false}>
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => router.push(fullPageHref)}
                aria-label="全頁模式"
              >
                <RiArrowRightUpLine className="size-4" />
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
          {children}
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
