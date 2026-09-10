import { AlertDialogBody } from "@/components/ui/alert-dialog";
import type { ErrorMessage } from "@/lib/api/error-messages";

export const ErrorNotice = ({ message }: { message: ErrorMessage }) => (
  <AlertDialogBody className="gap-1 text-sm text-destructive">
    <p className="font-medium">{message.title}</p>
    <p>{message.description}</p>
  </AlertDialogBody>
);
