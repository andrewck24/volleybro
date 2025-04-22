import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

export const Figures = ({
  label,
  values,
  disableBarChart = false,
  className,
}: {
  label: string;
  values: { left: number; right: number };
  disableBarChart?: boolean;
  className?: string;
}) => {
  const isLeftLarger = values.left > values.right;
  const isRightLarger = values.right > values.left;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-1">
      <div
        className={cn(
          "flex w-full flex-row items-center justify-center gap-2 font-medium",
          className,
        )}
      >
        <Figure
          value={values.left}
          variant={isLeftLarger ? "primaryText" : "secondary"}
        />
        <span className="flex flex-1 items-center justify-center">{label}</span>
        <Figure
          value={values.right}
          variant={isRightLarger ? "destructiveText" : "secondary"}
        />
      </div>
      {disableBarChart || <BarChart values={values} />}
    </div>
  );
};

export const figureVariants = cva(
  "flex items-center justify-center rounded-lg px-1 font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "text-foreground",
        primary: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        secondary: "bg-secondary text-muted-foreground",
        outline: "border text-foreground",
        primaryText: "bg-accent text-primary",
        destructiveText: "bg-accent text-destructive",
      },
      size: {
        sm: "size-12 text-[1.5rem]",
        default: "size-15 text-[2rem]",
        lg: "size-16 text-[3rem]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface FigureProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof figureVariants> {
  value: number;
}

export const Figure = ({ value, size, variant, className }: FigureProps) => {
  return (
    <div className={cn(figureVariants({ size, variant }), className)}>
      {value}
    </div>
  );
};

export const BarChart = ({
  values,
}: {
  values: { left: number; right: number };
}) => {
  const total = values.left + values.right;
  const leftScale = total === 0 ? 0 : (values.left / total) * 2;
  const rightScale = total === 0 ? 0 : (values.right / total) * 2;

  return (
    <div className="grid h-2 w-full grid-cols-2 overflow-hidden rounded bg-accent">
      <div
        className={cn("origin-left bg-primary transition-all")}
        style={{ transform: `scaleX(${leftScale})` }}
      />
      <div
        className={cn("origin-right bg-destructive transition-all")}
        style={{ transform: `scaleX(${rightScale})` }}
      />
    </div>
  );
};
