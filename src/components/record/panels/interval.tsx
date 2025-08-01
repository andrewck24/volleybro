"use client";
import { Card } from "@/components/ui/card";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";

const RecordInterval = ({
  recordId,
  className,
}: {
  recordId: string;
  className?: string;
}) => {
  const { inProgress } = useAppSelector((state) => state.record.general.status);

  return (
    <Card
      className={cn(
        "w-full flex-1 items-center justify-center px-8 pb-4",
        className,
      )}
    >
      {/* <Dialog defaultOpen={!inProgress}>
        <DialogTrigger asChild>
          <Button size="lg" className="w-full">
            開始下一局
          </Button>
        </DialogTrigger>
        <SetOptions recordId={recordId} />
      </Dialog> */}
    </Card>
  );
};

export default RecordInterval;
