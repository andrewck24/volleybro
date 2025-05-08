const RocordLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex size-full flex-col items-center justify-start pt-[calc(env(safe-area-inset-top)+5.5rem)]">
      <div className="flex size-full max-w-[640px] flex-col items-center justify-start gap-1 overflow-hidden">
        {children}
      </div>
    </main>
  );
};

export default RocordLayout;
