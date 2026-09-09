import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import { RiAlertLine, RiRefreshLine } from "react-icons/ri";

interface ServerErrorStateProps {
  onRetry?: () => void;
  className?: string;
}

export function ServerErrorState({
  onRetry,
  className,
}: ServerErrorStateProps) {
  return (
    <Alert variant="destructive" className={className}>
      <RiAlertLine />
      <AlertTitle>{ERROR_MESSAGES.SERVER_ERROR.title}</AlertTitle>
      <AlertDescription>
        {ERROR_MESSAGES.SERVER_ERROR.description}
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
