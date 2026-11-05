import { AuthSheet } from "@/components/auth/sheet";
import { Link } from "@/components/ui/button";

const AuthError = () => {
  return (
    <AuthSheet
      title="登入沒有完成"
      description="登入過程發生問題，請再試一次。"
    >
      <Link size="lg" className="w-full" href="/auth/sign-in">
        回到登入頁
      </Link>
    </AuthSheet>
  );
};

export default AuthError;
