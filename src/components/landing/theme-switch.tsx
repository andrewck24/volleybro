"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { RiComputerLine, RiMoonLine, RiSunLine } from "react-icons/ri";

// The footer's theme switch in the header's language (LAYERS L2
// chrome): the app nav's glass pill (bg-background/94, shadow-lg,
// ring-1 ring-foreground/10, backdrop-blur-sm), rounded-2xl (16) with p-1.5
// (6), so the buttons inside are rounded-[10px]; the chosen one takes the
// header CTA's primary fill.
const THEMES = [
  { value: "system", label: "跟隨系統", Icon: RiComputerLine },
  { value: "light", label: "淺色", Icon: RiSunLine },
  { value: "dark", label: "深色", Icon: RiMoonLine },
] as const;

export const ThemeSwitch = () => {
  const mounted = useHydrated();
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="色彩主題"
      className="flex items-center gap-1 rounded-2xl bg-background/94 p-1.5 text-foreground shadow-lg ring-1 ring-foreground/10 backdrop-blur-sm"
    >
      {THEMES.map(({ value, label, Icon }) => {
        const on = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={on}
            disabled={!mounted}
            onClick={() => setTheme(value)}
            className={cn(
              "grid size-9 place-items-center rounded-[10px] transition-colors",
              on
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
