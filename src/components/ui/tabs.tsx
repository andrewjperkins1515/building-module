import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

/** Underline-style tab list for page-level navigation. */
export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("scrollbar-thin flex items-end gap-5 overflow-x-auto border-b border-border", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative -mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent pb-2.5 pt-1 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink focus-visible:outline-none data-[state=active]:border-navy data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

/** Segmented control style (used for small toggles). */
export function SegmentedList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex items-center rounded-md border border-border bg-subtle p-0.5", className)} {...props} />;
}

export function SegmentedTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium text-ink-3 transition-colors hover:text-ink data-[state=active]:bg-background data-[state=active]:text-ink data-[state=active]:shadow-xs [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
