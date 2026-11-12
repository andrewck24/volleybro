"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

const SEGMENT_BOX = "h-7 w-11 rounded-md";

interface SegmentedPickerProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

const SegmentedPicker = ({
  label,
  value,
  onValueChange,
  children,
  className,
}: SegmentedPickerProps) => {
  const index = React.Children.toArray(children).findIndex(
    (child) =>
      React.isValidElement<{ value?: string }>(child) &&
      child.props.value === value,
  );

  return (
    <RadioGroupPrimitive.Root
      data-slot="SegmentedPicker"
      aria-label={label}
      orientation="horizontal"
      loop
      value={value}
      onValueChange={onValueChange}
      className={cn(
        "relative inline-flex rounded-lg bg-background p-0.5",
        className,
      )}
    >
      {index >= 0 && (
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 ${SEGMENT_BOX} bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none`}
          style={{ transform: `translateX(${index * 100}%)` }}
        />
      )}
      {children}
    </RadioGroupPrimitive.Root>
  );
};

const SegmentedPickerItem = ({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) => (
  <RadioGroupPrimitive.Item
    data-slot="SegmentedPickerItem"
    className={cn(
      `touch-target relative z-10 inline-flex ${SEGMENT_BOX} items-center justify-center text-sm font-medium text-foreground transition-colors duration-200 ease-out focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden data-[state=checked]:text-primary-foreground motion-reduce:transition-none`,
      className,
    )}
    {...props}
  />
);

export { SegmentedPicker, SegmentedPickerItem };
