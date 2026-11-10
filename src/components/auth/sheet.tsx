// Not draggable or dismissible, so no grabber.
export const AuthSheet = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section
    aria-labelledby="auth-sheet-title"
    className="flex w-full flex-col gap-6 rounded-t-2xl bg-card px-6 pt-7 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-card-foreground sm:mx-auto sm:mb-[max(env(safe-area-inset-bottom),2rem)] sm:max-w-md sm:rounded-2xl sm:pb-7 sm:shadow-md lg:m-0 lg:w-md lg:max-w-none lg:shrink-0 lg:justify-start lg:rounded-l-2xl lg:rounded-r-none lg:pt-[max(3rem,calc(50dvh-6rem))] lg:pr-[max(3rem,env(safe-area-inset-right))] lg:pb-12 lg:pl-12 lg:shadow-none xl:w-lg"
  >
    <h2 id="auth-sheet-title" className="text-xl font-semibold">
      {title}
    </h2>
    {children}
  </section>
);
