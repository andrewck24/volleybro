import { cn } from "@/lib/utils";

export const Panels = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      data-slot="Panels"
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-start gap-2 overflow-x-hidden overflow-y-scroll bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const PanelHeader = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      data-slot="PanelHeader"
      className="flex h-9 w-full items-center justify-start pt-2"
    >
      {children}
    </div>
  );
};

export const PanelTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <h3 data-slot="PanelTitle" className="flex-1 text-left text-lg font-medium">
      {children}
    </h3>
  );
};

export const PanelDescription = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <p className="text-sm text-muted-foreground" data-slot="PanelDescription">
      {children}
    </p>
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
        "flex w-full flex-1 flex-col items-center justify-start gap-2 overflow-y-scroll",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const PanelSection = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <section
      data-slot="PanelSection"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 pt-2",
        className,
      )}
    >
      {children}
    </section>
  );
};

export const PanelSectionTitle = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <h4
      data-slot="PanelSectionTitle"
      className="w-full flex-1 text-left text-lg font-medium text-muted-foreground"
    >
      {children}
    </h4>
  );
};
