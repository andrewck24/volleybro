"use client";

import { cn } from "@/lib/utils";
import { RiAddBoxLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { NewRecordForm } from "@/components/record/new";

export const ActionButton = ({ teamId }: { teamId: string }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <AddButton />
      </DialogTrigger>
      <DialogContent size="lg">
        <NewRecordForm teamId={teamId} />
      </DialogContent>
    </Dialog>
  );
};

const AddButton = ({ ...props }) => {
  return (
    <Button
      className={cn(
        "flex flex-col items-center justify-center flex-1 h-full pt-2",
        "text-foreground [&>svg]:size-10 text-xs",
        "transition-all duration-200 ease-in-out"
      )}
      variant="ghost"
      {...props}
    >
      <RiAddBoxLine />
    </Button>
  );
};
