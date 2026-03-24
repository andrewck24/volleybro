"use client";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useTheme } from "next-themes";
import {
  RiSunLine,
  RiSunFill,
  RiMoonLine,
  RiMoonFill,
  RiDeviceLine,
  RiDeviceFill,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";

export const DarkMode = () => {
  const mounted = useHydrated();
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <Button variant="outline" size="wide">
        <RiMoonLine />
        深色模式
      </Button>
    );
  }

  return (
    <div className="flex flex-row gap-1 bg-muted p-1 rounded-md">
      <Button
        variant={theme === "system" ? "default" : "ghost"}
        onClick={() => setTheme("system")}
      >
        {theme === "system" ? <RiDeviceFill /> : <RiDeviceLine />}
      </Button>
      <Button
        variant={theme === "light" ? "default" : "ghost"}
        onClick={() => setTheme("light")}
      >
        {theme === "light" ? <RiSunFill /> : <RiSunLine />}
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "ghost"}
        onClick={() => setTheme("dark")}
      >
        {theme === "dark" ? <RiMoonFill /> : <RiMoonLine />}
      </Button>
    </div>
  );
};
