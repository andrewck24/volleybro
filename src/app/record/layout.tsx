const RecordLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex size-full flex-col items-center justify-start pt-[calc(env(safe-area-inset-top)+5.5rem)]">
      {children}
    </main>
  );
};

export default RecordLayout;
