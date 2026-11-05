"use client";
import { AuthSheet } from "@/components/auth/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { RiErrorWarningLine } from "react-icons/ri";

// Google's sign-in branding: a neutral fill with a hairline edge in each
// theme, the standard G and an approved label. These are Google's values, not
// VolleyBro tokens.
const GOOGLE_BUTTON =
  "h-auto min-h-(--control-size-lg) w-full bg-white px-4 py-2 text-base whitespace-normal text-[#1f1f1f] ring-[#747775] hover:bg-[#f2f2f2] dark:bg-[#131314] dark:text-[#e3e3e3] dark:ring-[#8e918f] dark:hover:bg-[#1f1f20] focus-visible:ring-2 focus-visible:ring-primary-text dark:focus-visible:ring-primary-text [&>svg]:size-5";

const SignInError = () => {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  if (!urlError) return null;

  const errorMessage =
    urlError === "OAuthAccountNotLinked"
      ? "這個 Email 已用其他方式註冊，請改用原本的方式登入。"
      : "登入沒有完成，請再試一次。";

  return (
    <Alert variant="error">
      <RiErrorWarningLine />
      <AlertTitle>登入失敗</AlertTitle>
      <AlertDescription>{errorMessage}</AlertDescription>
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
        className={GOOGLE_BUTTON}
        onClick={handleGoogleSignIn}
        loading={isSubmitting}
      >
        <FcGoogle />
        使用 Google 帳戶繼續
      </Button>
      <p className="text-sm text-pretty text-muted-foreground">
        第一次使用會自動建立帳號。繼續即表示您同意服務條款與隱私權政策。
      </p>
    </AuthSheet>
  );
};

export default SignInForm;
