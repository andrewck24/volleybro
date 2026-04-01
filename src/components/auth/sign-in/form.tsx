"use client";
import { Logo } from "@/components/custom/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { RiAlertLine } from "react-icons/ri";

const SignInError = () => {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const errorMessage =
    urlError === "OAuthAccountNotLinked"
      ? "看來您已使用其他方式註冊，請使用原註冊方式登入"
      : urlError
        ? "登入時發生錯誤，請稍後再試"
        : "";

  if (urlError)
    return (
      <Alert variant="destructive">
        <RiAlertLine />
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
    <Card className="h-[50%] w-full max-w-150 rounded-lg bg-transparent text-primary-foreground shadow-none">
      <CardHeader className="flex-1 flex-col items-start">
        <Logo className="max-h-fit justify-start" />
        <p className="text-2xl">快速記錄每一場精彩的比賽。</p>
      </CardHeader>
      <Separator className="bg-primary-foreground" />
      <CardContent>
        <Suspense>
          <SignInError />
        </Suspense>
        <Button
          variant="outline"
          size="lg"
          className="w-full text-foreground"
          onClick={handleGoogleSignIn}
          loading={isSubmitting}
        >
          <FcGoogle />
          使用 Google 帳戶繼續
        </Button>
      </CardContent>
      <CardFooter className="items-center pb-[15vh]">
        <p className="font-thin text-accent">
          如果註冊，即表示您同意服務條款和隱私政策。
        </p>
      </CardFooter>
    </Card>
  );
};

export default SignInForm;
