import { StatusBarColor } from "@/components/layout/status-bar-color";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex h-full w-full flex-col items-center justify-end gap-0 overflow-hidden overscroll-y-none bg-primary p-0 px-[5%]">
      <StatusBarColor color="var(--color-primary)" />
      {children}
    </main>
  );
};

export default AuthLayout;
