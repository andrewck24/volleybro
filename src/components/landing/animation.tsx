import { cn } from "@/lib/utils";

export const SquaresStack = () => {
  const SQUARES = 10;
  const HIGHLIGHT = 4;

  return (
    <div
      className="absolute top-0 right-0 overflow-hidden pointer-events-none"
      style={{
        width: "calc(min(100vw, 100vh))",
        height: "calc(min(100vw, 100vh))",
      }}
    >
      {[...Array(SQUARES)].map((_, index) => (
        <div
          key={index}
          className={cn(
            "absolute top-0 right-0 aspect-square transition duration-300 rounded-full",
            index === SQUARES - HIGHLIGHT
              ? "bg-destructive"
              : "bg-background dark:bg-foreground"
          )}
          style={{
            width: `calc(min(100vw, 100vh) * (0.65 - ${index * 0.05}))`,
            height: `calc(min(100vw, 100vh) * (0.65 - ${index * 0.05}))`,
            opacity: 0.1 + index * 0.1,
          }}
        />
      ))}
    </div>
  );
};
