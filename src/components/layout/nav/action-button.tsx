"use client";

import { NewGameForm } from "@/components/game/new";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RiAddBoxLine } from "react-icons/ri";

export const ActionButton = ({
  teamId,
  className,
}: {
  teamId?: string;
  className?: string;
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <AddButton className={className} disabled={!teamId} />
      </DialogTrigger>
      <DialogContent size="lg">
        {teamId && <NewGameForm teamId={teamId} />}
      </DialogContent>
    </Dialog>
  );
};

const AddButton = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => {
  return (
    <Button
      className={cn(
        "-mt-5 md:mt-0 md:w-full md:rounded-xl",
        "relative flex size-13 shrink-0 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg ring-1 ring-gray-950/10 dark:ring-white/20 [&>svg]:size-7",
        "transition-color duration-200 ease-in-out hover:bg-primary/90",
        className,
      )}
      variant="default"
      size="icon"
      {...props}
    >
      <RiAddBoxLine />
      <span className="sr-only">新增賽事</span>
    </Button>
  );
};
