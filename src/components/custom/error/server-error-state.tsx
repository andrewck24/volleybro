import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RiAlertLine, RiRefreshLine } from "react-icons/ri";

interface ServerErrorStateProps {
  onRetry?: () => void;
  className?: string;
}

export function ServerErrorState({ onRetry, className }: ServerErrorStateProps) {
  return (
    <Alert variant="destructive" className={className}>
      <RiAlertLine />
      <AlertTitle>哎呀！球掉了...</AlertTitle>
      <AlertDescription>
        伺服器暫時無法處理請求，請稍後再試
      </AlertDescription>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RiRefreshLine />
          再試一次
        </Button>
      )}
    </Alert>
  );
}
