import { cn } from "@/lib/utils";

/**
 * The card surface an auth route presents on the brand ground: a bottom sheet
 * on phones, a floating card from `sm`, and a full-height panel docked to the
 * right edge from `lg`. The side facing the content is rounded and the side
 * on the screen edge is square. It cannot be dragged or dismissed, so it
 * carries no grabber.
 */
export const AuthSheet = ({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    aria-labelledby="auth-sheet-title"
    className={cn(
      "flex w-full flex-col gap-6 rounded-t-2xl bg-card px-6 pt-7 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-card-foreground sm:mx-auto sm:mb-[max(env(safe-area-inset-bottom),2rem)] sm:max-w-md sm:rounded-2xl sm:pb-7 sm:shadow-md lg:m-0 lg:w-md lg:max-w-none lg:shrink-0 lg:justify-start lg:rounded-l-2xl lg:rounded-r-none lg:pt-[max(3rem,calc(50dvh-6rem))] lg:pr-[max(3rem,env(safe-area-inset-right))] lg:pb-12 lg:pl-12 lg:shadow-none xl:w-lg",
      className,
    )}
  >
    <div className="flex flex-col gap-2">
      <h2 id="auth-sheet-title" className="text-xl font-semibold">
        {title}
      </h2>
      {description && (
        <p className="text-base text-pretty text-muted-foreground">
          {description}
        </p>
      )}
    </div>
    {children}
  </section>
);
