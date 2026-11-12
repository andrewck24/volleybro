import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";

export const PickerRow = ({
  code,
  label,
  icon,
  pressed,
  disabled,
  onClick,
}: {
  code?: React.ReactNode;
  label: React.ReactNode;
  icon?: React.ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <Item asChild variant="outline">
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {icon && <ItemMedia>{icon}</ItemMedia>}
      <ItemMedia className="basis-8 justify-end text-xl font-semibold">
        {code || " "}
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="text-xl">{label}</ItemTitle>
      </ItemContent>
    </button>
  </Item>
);
