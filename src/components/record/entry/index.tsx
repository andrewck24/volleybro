import { cn } from "@/lib/utils";
import Rally from "@/components/record/entry/rally";
import Substitution from "@/components/record/entry/substitution";
import {
  type Player,
  type Entry as IEntry,
  EntryType,
  Rally as RallyType,
  Substitution as SubstitutionType,
} from "@/entities/record";

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
      "flex flex-row items-center justify-start flex-none w-full gap-1 basis-8",
      className
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
        "flex items-center justify-center flex-none",
        "basis-8 size-8 text-[1.5rem] rounded-[0.5rem] font-semibold",
        win !== null &&
          (win ? "bg-primary text-primary-foreground" : "bg-accent")
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
      "flex flex-row flex-1 text-[1.375rem] items-center gap-1 px-1 h-6",
      "max-w-[calc(100%-9rem)] border-l-[0.125rem]",
      "[&>svg]:size-6 stroke-[3px]",
      className
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

const Entry = ({
  entry,
  players,
  onClick,
  className,
}: {
  entry: IEntry;
  players: Player[];
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <EntryContainer onClick={onClick} className={className}>
      {entry.type === EntryType.RALLY ? (
        <Rally rally={entry.data as RallyType} players={players} />
      ) : (
        <Substitution
          substitution={entry.data as SubstitutionType}
          players={players}
        />
      )}
    </EntryContainer>
  );
};

export default Entry;
