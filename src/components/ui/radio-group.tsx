"use client";

import * as React from "react";
import { RiCheckLine } from "react-icons/ri";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

const RadioGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) => (
  <RadioGroupPrimitive.Root
    data-slot="RadioGroup"
    className={cn("grid gap-2", className)}
    {...props}
  />
);

const RadioGroupItem = ({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) => (
  <RadioGroupPrimitive.Item
    data-slot="RadioGroupItem"
    className={cn(
      "aspect-square size-4 rounded-full border border-primary text-primary shadow-sm focus:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <RiCheckLine className="size-3.5 fill-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
);

export { RadioGroup, RadioGroupItem };
