import { Rally } from "@/components/game/entry/rally";
import { Substitution } from "@/components/game/entry/substitution";
import { EntryType, type Player, type Entry as TEntry } from "@/entities/game";
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
        <Rally data={entry} players={players} />
      ) : entry.type === EntryType.SUBSTITUTION ? (
        <Substitution data={entry} players={players} />
      ) : null}
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
      "max-w-[calc(100%-9rem)] border-l-2",
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
}) => (
  <span className="flex size-6 items-center justify-center text-[1.375rem] font-semibold">
    {children}
  </span>
);
