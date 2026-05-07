/*
 * workspace mode: routes outside (tabs) that render without bottom navigation.
 * Serves as the hard-navigation fallback for intercepted team edit routes.
 * Content is constrained to mx-auto w-full max-w-196, matching tab content width.
 */
const WorkspaceLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="mx-auto flex w-full max-w-196 flex-col pt-[calc(env(safe-area-inset-top)+3rem)] pb-[env(safe-area-inset-bottom)]">
      {children}
    </main>
  );
};

export default WorkspaceLayout;
