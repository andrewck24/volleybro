import { StatusBarColor } from "@/components/layout/status-bar-color";

const GameLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex w-full flex-col items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+var(--header-height))] pb-[env(safe-area-inset-bottom)]">
      <StatusBarColor color="var(--color-card)" />
      {children}
    </main>
  );
};

export default GameLayout;
