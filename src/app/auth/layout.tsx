import { BodyBackdrop } from "@/components/layout/body-backdrop";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex h-full w-full flex-col items-center justify-end gap-0 overflow-hidden overscroll-y-none bg-primary p-0 px-[5%]">
      <BodyBackdrop color="var(--color-primary)" />
      {children}
    </main>
  );
};

export default AuthLayout;
