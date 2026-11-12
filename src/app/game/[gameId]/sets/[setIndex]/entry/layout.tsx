const EntryLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-start overflow-hidden bg-background">
      {children}
    </div>
  );
};

export default EntryLayout;
