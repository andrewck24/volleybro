import { cn } from "@/lib/utils";

export const Panel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      data-slot="Panel"
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-start gap-2 overflow-x-hidden bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const PanelContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      data-slot="PanelContent"
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-start gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
};
