import { StatusBarColor } from "@/components/layout/status-bar-color";

const GameLayout = ({ children }: { children: React.ReactNode }) => {
  // Every game header (overview, sets, recording) is a card surface.
  return (
    <main className="flex w-full flex-col items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[env(safe-area-inset-bottom)]">
      <StatusBarColor color="var(--color-card)" />
      {children}
    </main>
  );
};

export default GameLayout;
