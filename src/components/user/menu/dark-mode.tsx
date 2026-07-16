"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import {
  RiDeviceFill,
  RiDeviceLine,
  RiMoonFill,
  RiMoonLine,
  RiSunFill,
  RiSunLine,
} from "react-icons/ri";

export const DarkMode = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="wide">
          <RiMoonLine />
          深色模式
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>深色模式</DialogTitle>
          <DialogDescription srOnly>選擇深色模式</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <DialogClose asChild>
            <Button
              variant={theme === "system" ? "default" : "secondary"}
              onClick={() => setTheme("system")}
            >
              {theme === "system" ? <RiDeviceFill /> : <RiDeviceLine />}
              系統
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant={theme === "light" ? "default" : "secondary"}
              onClick={() => setTheme("light")}
            >
              {theme === "light" ? <RiSunFill /> : <RiSunLine />}
              亮色
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant={theme === "dark" ? "default" : "secondary"}
              onClick={() => setTheme("dark")}
            >
              {theme === "dark" ? <RiMoonFill /> : <RiMoonLine />}
              深色
            </Button>
          </DialogClose>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
