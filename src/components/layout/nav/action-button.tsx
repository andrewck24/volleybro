"use client";

import { NewGameForm } from "@/components/game/new";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RiAddBoxLine } from "react-icons/ri";

export const ActionButton = ({ teamId }: { teamId: string }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <AddButton />
      </DialogTrigger>
      <DialogContent size="lg">
        <NewGameForm teamId={teamId} />
      </DialogContent>
    </Dialog>
  );
};

const AddButton = ({ ...props }) => {
  return (
    <Button
      className={cn(
        "relative -mt-5 flex size-12 shrink-0 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg ring-1 ring-gray-950/10 dark:ring-white/20 [&>svg]:size-7",
        "transition-all duration-200 ease-in-out hover:bg-primary/90",
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
