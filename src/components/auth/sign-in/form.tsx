"use client";
import { AuthSheet } from "@/components/auth/sheet";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { RiErrorWarningLine } from "react-icons/ri";

// The theme contrasts with the sheet: dark button on the light sheet, light
// button on the dark sheet.
const GOOGLE_BRAND_BUTTON =
  "h-auto min-h-(--control-size-lg) w-full bg-[#131314] px-4 py-2 text-base whitespace-normal text-[#e3e3e3] ring-[#8e918f] hover:bg-[#2b2b2d] dark:bg-white dark:text-[#1f1f1f] dark:ring-[#747775] dark:hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-primary-text dark:focus-visible:ring-primary-text [&>svg]:size-5";

// Only the code picks a fixed message; nothing from the URL is shown.
const signInErrorMessage = (code: string) =>
  code === "access_denied"
    ? "已取消登入，要登入請再按一次下方按鈕。"
    : "登入失敗，請再按一次下方按鈕。";

const SignInError = () => {
  const searchParams = useSearchParams();
  const code = searchParams.get("error");
  if (!code) return null;

  return (
    <Alert variant="error">
      <RiErrorWarningLine />
      <AlertTitle className="mb-0">{signInErrorMessage(code)}</AlertTitle>
    </Alert>
  );
};

const SignInForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/home",
        errorCallbackURL: "/auth/sign-in",
      });
    } catch {
      // sign-in errors are surfaced via URL error params after redirect
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSheet title="登入或註冊">
      <Suspense>
        <SignInError />
      </Suspense>
      <Button
        variant="outline"
        size="lg"
        className={GOOGLE_BRAND_BUTTON}
        onClick={handleGoogleSignIn}
        loading={isSubmitting}
      >
        <FcGoogle />
        使用 Google 帳戶登入
      </Button>
      <p className="text-sm text-pretty text-muted-foreground">
        登入即表示您同意服務條款與隱私權政策。
      </p>
    </AuthSheet>
  );
};

export default SignInForm;
