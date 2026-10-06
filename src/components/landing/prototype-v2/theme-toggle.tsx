"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { RiComputerLine, RiMoonLine, RiSunLine } from "react-icons/ri";

// PROTOTYPE: the footer's theme switch in the court's vocabulary — three
// cells divided by white lines, the chosen one filled coral (ink icon 6.67:1).
const OPTIONS = [
  { value: "system", label: "跟隨系統", Icon: RiComputerLine },
  { value: "light", label: "淺色", Icon: RiSunLine },
  { value: "dark", label: "深色", Icon: RiMoonLine },
] as const;

export const ThemeToggle = () => {
  const mounted = useHydrated();
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="色彩主題"
      className="flex divide-x-(length:--v2-lw) divide-(--v2-line) border-(length:--v2-lw) border-(--v2-line)"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
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
              "grid size-11 place-items-center transition-colors",
              on
                ? "bg-(--v2-in) text-(--v2-ink)"
                : "text-(--v2-on-free) hover:bg-(--v2-on-free)/10",
            )}
          >
            <Icon className="size-5" />
          </button>
        );
      })}
    </div>
  );
};
