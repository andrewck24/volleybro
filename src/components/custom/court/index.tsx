import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FiPlus } from "react-icons/fi";
import { RiRepeat2Line } from "react-icons/ri";

type CardPlayer = {
  id: string;
  name: string;
  number?: number;
  position: string;
};

export const Court = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "flex aspect-11/9 max-h-[35vh] w-full flex-row justify-center bg-primary p-2",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const Outside = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "relative grid flex-1 grid-rows-3 gap-2 border-4 border-l-0 border-transparent pr-1 before:absolute before:top-0 before:min-h-[calc((100%-1rem)/3)] before:w-full before:border-b-4 before:border-dashed before:border-primary-foreground before:content-['']",
        className,
      )}
    >
      {children}
    </div>
  );
};
// TODO: 目前手機版未沒有寬度更大的球場，未來需注意其他螢幕大小的排版

export const Inside = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="relative grid flex-9 gap-2 border-4 border-primary-foreground bg-[hsl(12.93,96.67%,76.47%)] px-2 py-[5%] [grid-template-areas:'z4_z3_z2''z5_z6_z1'] before:absolute before:top-0 before:min-h-[calc((100%-1rem)/3)] before:w-full before:border-b-4 before:border-background before:bg-destructive before:content-[''] dark:before:border-primary-foreground">
      {children}
    </div>
  );
};

// TODO: 移除 onSwitchClick 後，重新檢視參數定義
const Card = ({
  children,
  className,
  onClick,
  empty,
  toggled,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  empty?: boolean;
  toggled?: boolean;
  [key: string]: unknown;
}) => {
  return (
    <div
      className={cn(
        "relative flex size-full flex-col items-center justify-center",
        "rounded-lg border-4 border-primary-foreground bg-card p-1 text-foreground dark:bg-foreground dark:text-card",
        "z-1 transition-all duration-200",
        empty && "border-primary-foreground/50 bg-primary-foreground/50",
        toggled &&
          "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

const Number = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p
      className={cn(
        "flex items-center justify-center",
        "max-h-12 min-h-12 max-w-12 min-w-12",
        "text-[3rem] font-bold [&>svg]:size-12",
      )}
    >
      {children}
    </p>
  );
};

const Position = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p
      className={cn(
        "flex items-center justify-center",
        "max-h-5 min-h-5 max-w-5 min-w-5",
        "text-[1.25rem] font-normal [&>svg]:size-5",
      )}
    >
      {children}
    </p>
  );
};

export const SubIndicator = ({ number }: { number: number }) => {
  return (
    <Badge
      className={cn(
        "absolute aspect-square h-6 w-6",
        "flex items-center justify-center",
        "m-1 rounded-full border-2 border-primary-foreground",
        "transition-all duration-200",
        "text-primary-foreground [&>svg]:size-5",
        "-top-3 -right-3 bg-primary",
      )}
    >
      <RiRepeat2Line />
      <span className="sr-only">替補</span>
      <span className="flex w-6 justify-center">{number}</span>
    </Badge>
  );
};

export const PlayerCard = ({
  player,
  toggled,
  list,
  zone,
  onClick,
  children,
}: {
  player: CardPlayer | null;
  toggled: boolean;
  list: string;
  zone: number;
  onClick: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <Card
      style={list === "starting" ? { gridArea: `z${zone}` } : {}}
      toggled={toggled}
      empty={!player}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {player ? (
        <>
          {children}
          <Number>{player.number}</Number>
          <Position>{player.position}</Position>
        </>
      ) : (
        <>
          <Number>
            <FiPlus />
          </Number>
          <Position />
        </>
      )}
    </Card>
  );
};

export const LoadingCard = ({ className }: { className?: string }) => {
  return (
    <Card className={cn("motion-safe:animate-pulse", className)}>
      <Number />
      <Position />
    </Card>
  );
};

export const PlaceholderCard = ({ className }: { className?: string }) => {
  return (
    <Card className={cn("border-none bg-transparent", className)}>
      <Number />
      <Position />
    </Card>
  );
};

export const AdjustButton = ({
  onClick,
  children,
}: {
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        "text-primary-foreground [&>svg]:size-10",
        "z-10",
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const LoadingCourt = ({ className }: { className?: string }) => {
  return (
    <Court className={className}>
      <Outside>
        <AdjustButton />
        {Array.from({ length: 2 }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </Outside>
      <Inside>
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </Inside>
    </Court>
  );
};
