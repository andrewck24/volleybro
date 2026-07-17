import { BodyBackdrop } from "@/components/layout/body-backdrop";

const EntryLayout = ({ children }: { children: React.ReactNode }) => {
  // The recording UI is a single-screen, app-like surface. `fixed inset-0`
  // pins it to the dynamic viewport and escapes the parent game layout's
  // padding/growing height (which double-padded the header and pushed the
  // drawer off-screen). A plain <div> avoids nesting a second <main>.
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-start overflow-hidden bg-background">
      <BodyBackdrop color="var(--color-card)" />
      {children}
    </div>
  );
};

export default EntryLayout;
