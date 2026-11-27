"use client";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  RiDeviceFill,
  RiDeviceLine,
  RiMoonFill,
  RiMoonLine,
  RiSunFill,
  RiSunLine,
} from "react-icons/ri";

const THEMES = [
  { value: "system", label: "系統", icon: RiDeviceLine, current: RiDeviceFill },
  { value: "light", label: "亮色", icon: RiSunLine, current: RiSunFill },
  { value: "dark", label: "深色", icon: RiMoonLine, current: RiMoonFill },
] as const;

export const DarkMode = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Item asChild variant="muted">
          <button type="button">
            <ItemMedia>
              <RiMoonLine />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>深色模式</ItemTitle>
            </ItemContent>
          </button>
        </Item>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-w-page">
        <DrawerHandle />
        <DrawerHeader className="px-(--page-gutter) text-left">
          <DrawerTitle>深色模式</DrawerTitle>
          <DrawerDescription className="sr-only">
            選擇深色模式
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 px-(--page-gutter)">
          {THEMES.map(({ value, label, icon: Icon, current: Current }) => (
            <Button
              key={value}
              variant="segmented"
              aria-pressed={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
            >
              {theme === value ? <Current /> : <Icon />}
              {label}
            </Button>
          ))}
        </div>
        <DrawerFooter className="px-(--page-gutter) pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerClose asChild>
            <Button variant="outline">取消</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
