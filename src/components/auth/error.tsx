import { AuthSheet } from "@/components/auth/sheet";
import { Link } from "@/components/ui/button";

const AuthError = () => {
  return (
    <AuthSheet title="登入失敗">
      <Link size="lg" className="w-full" href="/auth/sign-in">
        重新登入
      </Link>
    </AuthSheet>
  );
};

export default AuthError;
