const MatchLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex w-full flex-col items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[env(safe-area-inset-bottom)]">
      {children}
    </main>
  );
};

export default MatchLayout;
