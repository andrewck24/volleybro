import { Button, Link, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  RiAddBoxLine,
  RiArrowRightLine,
  RiCheckLine,
  RiShare2Line,
} from "react-icons/ri";

type Platform = "iOS" | "desktop" | "mobile";

export const CTAButton = ({ className, ...props }: ButtonProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform, setPlatform] = useState<Platform>("mobile");
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const currentPlatform = checkPlatform();
    setPlatform(currentPlatform);

    // 檢查是否已經安裝為 PWA
    const isInStandalone =
      "standalone" in window.navigator &&
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandalone);

    // 非 Apple 平台使用 beforeinstallprompt
    if (currentPlatform === "mobile") {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
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
  }, []);

  const handleInstallClick = () => {
    if (platform === "mobile" && deferredPrompt) {
      (deferredPrompt as any).prompt();
      (deferredPrompt as any).userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        } else {
          console.log("User dismissed the install prompt");
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
      });
    }
  };

  // 如果已經以 PWA 模式運行，不顯示安裝按鈕
  if (isStandalone || platform === "desktop") {
    return (
      <Link
        href="/home"
        variant="outline"
        className={cn("border-0 bg-primary-foreground text-primary", className)}
      >
        開始使用
        <RiArrowRightLine />
      </Link>
    );
  }

  // iOS 的安裝指引
  if (platform === "iOS") {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            {...props}
            variant="outline"
            className={cn(
              "border-0 bg-primary-foreground text-primary",
              className,
            )}
          >
            開始使用
            <RiArrowRightLine />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>安裝此應用程式到主頁面</DialogTitle>
            <DialogDescription>
              透過以下步驟將此應用程式安裝到您的 iOS 裝置主頁面
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                <RiCheckLine />
                我知道了
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 其他平台的安裝按鈕
  return (
    <>
      {isInstallable && (
        <Button
          {...props}
          variant="outline"
          onClick={handleInstallClick}
          className={cn(
            "border-0 bg-primary-foreground text-primary",
            className,
          )}
        >
          安裝應用程式
        </Button>
      )}
    </>
  );
};

const checkPlatform = (): Platform => {
  const userAgent = navigator.userAgent.toLowerCase();

  // iOS 檢測
  if (/iphone|ipad|ipod/.test(userAgent)) {
    const match = userAgent.match(/version\/(\d+)/);
    if (match && parseInt(match[1], 10) >= 15) {
      return "iOS";
    }
    return "desktop";
  }

  // Desktop 檢測
  if (
    /windows nt/.test(userAgent) ||
    (/macintosh/.test(userAgent) && !/mobile/.test(userAgent)) ||
    (/linux/.test(userAgent) && !/android/.test(userAgent))
  ) {
    return "desktop";
  }

  // 其他所有情況視為 mobile
  return "mobile";
};
