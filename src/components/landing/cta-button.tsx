"use client";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useHydrated } from "@/hooks/use-hydrated";
import { isStandalone } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import {
  RiAddBoxLine,
  RiArrowRightLine,
  RiCheckLine,
  RiShare2Line,
} from "react-icons/ri";

type Platform = "iOS" | "desktop" | "mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const CTAButton = ({ className, children, ...props }: ButtonProps) => {
  const label = children ?? "開始使用";
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform] = useState<Platform>(() =>
    typeof window !== "undefined" ? checkPlatform() : "mobile",
  );
  const [isPwa] = useState<boolean>(() => isStandalone());
  const mounted = useHydrated();

  useEffect(() => {
    if (platform === "mobile") {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
      };
    }
  }, [platform]);

  const handleInstallClick = async () => {
    if (platform === "mobile" && deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;

        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (error) {
        console.error("PWA installation failed:", error);
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  if (!mounted) {
    return (
      <Button
        {...props}
        variant="outline"
        className={cn("border-0 bg-primary-foreground text-primary", className)}
        disabled
      >
        {label}
        <RiArrowRightLine />
      </Button>
    );
  }

  if (
    isPwa ||
    platform === "desktop" ||
    (platform === "mobile" && !isInstallable)
  ) {
    return (
      <Button
        asChild
        {...props}
        variant="outline"
        className={cn("border-0 bg-primary-foreground text-primary", className)}
      >
        <NextLink href="/home">
          {label}
          <RiArrowRightLine />
        </NextLink>
      </Button>
    );
  }

  if (platform === "iOS") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            {...props}
            variant="outline"
            className={cn(
              "border-0 bg-primary-foreground text-primary",
              className,
            )}
          >
            {label}
            <RiArrowRightLine />
          </Button>
        </AlertDialogTrigger>
        <IOSInstallInstruction />
      </AlertDialog>
    );
  }

  return (
    <Button
      {...props}
      variant="outline"
      onClick={handleInstallClick}
      className={cn("border-0 bg-primary-foreground text-primary", className)}
    >
      安裝應用程式
    </Button>
  );
};

const IOSInstallInstruction = () => {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>安裝此應用程式到主頁面</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogBody>
        <AlertDialogDescription>
          透過以下步驟將此應用程式安裝到您的 iOS 裝置主頁面
        </AlertDialogDescription>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center">
            <span className="w-4">1.</span>
            點擊下方的分享
            <RiShare2Line className="inline-block size-5" />
            按鈕
          </li>
          <li className="flex items-start">
            <span className="w-4">2.</span>
            向下滑動並選擇「加入主畫面
            <RiAddBoxLine className="inline-block size-5" />」
          </li>
        </ul>
      </AlertDialogBody>
      <AlertDialogFooter>
        <AlertDialogCancel>
          <RiCheckLine />
          我知道了
        </AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
};

const checkPlatform = (): Platform => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    const match = userAgent.match(/version\/(\d+)/);
    if (match && parseInt(match[1] ?? "", 10) >= 15) {
      return "iOS";
    }
    return "desktop";
  }

  if (
    /windows nt/.test(userAgent) ||
    (/macintosh/.test(userAgent) && !/mobile/.test(userAgent)) ||
    (/linux/.test(userAgent) && !/android/.test(userAgent))
  ) {
    return "desktop";
  }

  return "mobile";
};
