"use client";
import { Scores } from "@/components/game/header/scores";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { RiArrowLeftLine, RiSettings4Line } from "react-icons/ri";

export const GameHeader = ({
  gameId,
  handleOptionOpen,
}: {
  gameId?: string;
  handleOptionOpen?: (option: string) => void;
}) => {
  const router = useRouter();

  return (
    <header className="fixed top-0 z-10 flex h-[env(safe-area-inset-top)+5.5rem] w-full max-w-160 items-center justify-between">
      <div className="flex w-full items-center justify-between gap-2 rounded-b-lg bg-card px-2 pt-[env(safe-area-inset-top)] shadow-sm">
        <Button
          variant="ghost"
          className="[&>svg]:size-8"
          onClick={() => router.back()}
        >
          <RiArrowLeftLine />
          <span className="sr-only">Back</span>
        </Button>
        {gameId && handleOptionOpen ? (
          <Scores
            gameId={gameId}
            onClick={() => handleOptionOpen("overview")}
          />
        ) : (
          <div className="flex h-21 flex-1" />
        )}
        {handleOptionOpen ? (
          <Button
            variant="ghost"
            className="[&>svg]:size-8"
            onClick={() => handleOptionOpen("settings")}
          >
            <RiSettings4Line />
            <span className="sr-only">Options</span>
          </Button>
        ) : (
          <div className="size-12"></div>
        )}
      </div>
    </header>
  );
};
