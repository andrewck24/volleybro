import { LogoType } from "@/components/brand";
import { StatusBarColor } from "@/components/layout/status-bar-color";

// The teal brand ground continues from the launch splash; each auth route
// supplies the sheet that carries its one action. Below lg the brand sits on
// top of the sheet, close to the thumb; from lg the sheet docks to the right.
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="auth-layout flex min-h-dvh w-full flex-col overscroll-y-none bg-primary text-primary-foreground lg:flex-row">
      <StatusBarColor color="var(--color-primary)" />
      <div className="flex flex-1 flex-col justify-end px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-8 sm:mx-auto sm:w-full sm:max-w-md sm:px-0 lg:mx-0 lg:max-w-none lg:justify-center lg:px-28 lg:py-12">
        <LogoType
          variant="brand"
          className="h-11 max-w-full self-start lg:h-16"
        />
        <h1 className="mt-6 text-3xl leading-snug font-semibold text-balance lg:mt-10 lg:text-4xl">
          在場邊記下每一分。
        </h1>
        <p className="mt-2 text-lg text-pretty text-primary-foreground/80 lg:text-xl">
          每一球三下點擊，比賽結束統計就好了。
        </p>
      </div>
      {children}
    </main>
  );
};

export default AuthLayout;
