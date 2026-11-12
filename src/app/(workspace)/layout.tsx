import { StatusBarColor } from "@/components/layout/status-bar-color";

const WorkspaceLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="mx-auto flex w-full max-w-196 flex-col pt-[calc(env(safe-area-inset-top)+var(--header-height))] pb-[env(safe-area-inset-bottom)]">
      <StatusBarColor color="var(--color-background)" />
      {children}
    </main>
  );
};

export default WorkspaceLayout;
