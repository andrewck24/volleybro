"use client";
import { Scores } from "@/components/record/header/scores";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { RiArrowLeftLine, RiSettings4Line } from "react-icons/ri";

export const Header = ({
  recordId,
  handleOptionOpen,
}: {
  recordId?: string;
  handleOptionOpen?: (option: string) => void;
}) => {
  const router = useRouter();

  return (
    <header className="fixed top-0 z-10 flex w-full max-w-[640px] items-center justify-between">
      <div className="flex w-full items-center justify-between gap-2 rounded-b-lg bg-card px-2 pt-[env(safe-area-inset-top)] shadow-sm">
        <Button
          variant="ghost"
          className="[&>svg]:size-8"
          onClick={() => router.back()}
        >
          <RiArrowLeftLine />
          <span className="sr-only">Back</span>
        </Button>
        <Scores
          recordId={recordId}
          onClick={() => handleOptionOpen("overview")}
        />
        <Button
          variant="ghost"
          className="[&>svg]:size-8"
          onClick={() => handleOptionOpen("settings")}
        >
          <RiSettings4Line />
          <span className="sr-only">Options</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
