const MatchLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex flex-col items-center justify-center size-full overflow-hidden pt-[calc(env(safe-area-inset-top)+5.5rem)]">
      <div className="flex flex-col items-center justify-start size-full gap-1 max-w-[640px]">
        {children}
      </div>
    </main>
  );
};

export default MatchLayout;
