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
        "flex h-full flex-1 flex-col items-center justify-center pt-2",
        "text-xs text-foreground [&>svg]:size-10",
        "transition-all duration-200 ease-in-out",
      )}
      variant="ghost"
      {...props}
    >
      <RiAddBoxLine />
    </Button>
  );
};
