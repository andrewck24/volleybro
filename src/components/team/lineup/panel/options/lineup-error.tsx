import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const LineupError = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={() => setOpen(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>無法儲存當前陣容配置</DialogTitle>
          <DialogDescription srOnly>Error message</DialogDescription>
        </DialogHeader>
        <DialogBody>
          由於目前陣容中沒有自由球員自動替換所對應的位置，故無法完成陣容設定。
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
