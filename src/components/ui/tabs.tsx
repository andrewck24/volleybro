"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "@/lib/utils";

const Tabs = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root
    data-slot="Tabs"
    className={cn("flex flex-col", className)}
    {...props}
  />
);

const TabsList = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    data-slot="TabsList"
    className={cn(
      "mb-1 inline-flex h-10 items-center justify-center bg-card text-lg text-foreground",
      className,
    )}
    {...props}
  />
);

const TabsTrigger = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    data-slot="TabsTrigger"
    className={cn(
      "inline-flex h-full items-center justify-center border-2 border-transparent px-3 py-1 font-medium whitespace-nowrap ring-offset-background transition-all",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:border-b-primary data-[state=active]:bg-card data-[state=active]:text-primary",
      className,
    )}
    {...props}
  />
);

const TabsContent = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    data-slot="TabsContent"
    className={cn(
      "flex flex-col gap-2",
      "ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden",
      className,
    )}
    {...props}
  />
);

export { Tabs, TabsContent, TabsList, TabsTrigger };
