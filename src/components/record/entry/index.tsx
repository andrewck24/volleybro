import { Rally } from "@/components/record/entry/rally";
import { Substitution } from "@/components/record/entry/substitution";
import {
  EntryType,
  type Player,
  type Entry as TEntry,
  type Rally as TRally,
  type Substitution as TSubstitution,
} from "@/entities/record";
import { cn } from "@/lib/utils";

export const Entry = ({
  entry,
  players,
  onClick,
  className,
}: {
  entry: TEntry;
  players: Player[];
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <EntryContainer onClick={onClick} className={className}>
      {entry.type === EntryType.RALLY ? (
        <Rally data={entry.data as TRally} players={players} />
      ) : (
        <Substitution data={entry.data as TSubstitution} players={players} />
      )}
    </EntryContainer>
  );
};

export const EntryContainer = ({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "flex w-full flex-none basis-8 flex-row items-center justify-start gap-1",
      className,
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

// TODO: 使用 `Figure` 重構
export const EntryScore = ({
  win = null,
  children,
}: {
  win?: boolean;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "flex flex-none items-center justify-center",
        "size-8 basis-8 rounded-[0.5rem] text-[1.5rem] font-semibold",
        win !== null &&
          (win ? "bg-primary text-primary-foreground" : "bg-accent"),
      )}
    >
      {children}
    </div>
  );
};

export const EntryText = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <p
    className={cn(
      "flex h-6 flex-1 flex-row items-center gap-1 px-1 text-[1.375rem]",
      "max-w-[calc(100%-9rem)] border-l-[0.125rem]",
      "stroke-[3px] [&>svg]:size-6",
      className,
    )}
  >
    {children}
  </p>
);

export const EntryPlayerNumber = ({
  children,
}: {
  children: React.ReactNode;
}) => <span className="text-[1.375rem] font-semibold">{children}</span>;
