"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { RiArrowLeftLine } from "react-icons/ri";

export const Header = () => {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 z-10 flex h-[calc(env(safe-area-inset-top)+3rem)] w-full flex-row items-center justify-center gap-4 overscroll-none border-b-2 border-accent bg-card px-[5%] pt-[env(safe-area-inset-top)]">
      <Button
        onClick={() => router.push("/home")}
        variant="ghost"
        size="icon"
        className="[&>svg]:size-6"
      >
        <RiArrowLeftLine />
      </Button>
      <h1 className="flex-1 text-[1.25rem]">賽事紀錄</h1>
    </header>
  );
};
