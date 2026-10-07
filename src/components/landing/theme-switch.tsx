"use client";
import { GLASS_PILL } from "@/components/landing/copy";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { RiComputerLine, RiMoonLine, RiSunLine } from "react-icons/ri";

const THEMES = [
  { value: "system", label: "跟隨系統", Icon: RiComputerLine },
  { value: "light", label: "淺色", Icon: RiSunLine },
  { value: "dark", label: "深色", Icon: RiMoonLine },
] as const;

export const ThemeSwitch = () => {
  const isHydrated = useHydrated();
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="色彩主題"
      className={cn(
        "flex items-center gap-1 rounded-2xl p-1.5 ring-1",
        GLASS_PILL,
      )}
    >
      {THEMES.map(({ value, label, Icon }) => {
        const isSelected = isHydrated && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={isSelected}
            disabled={!isHydrated}
            onClick={() => setTheme(value)}
            className={cn(
              "grid size-9 place-items-center rounded-[10px] transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
          </button>
        );
      })}
    </div>
  );
};
