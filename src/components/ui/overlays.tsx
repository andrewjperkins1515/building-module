/** shadcn-style overlay primitives: Dialog, Sheet (side drawer), Popover, Tooltip, DropdownMenu. */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Dialog -----------------------------------------------------------------------

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay({ className }: { className?: string }) {
  return <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-navy/25 backdrop-blur-[1.5px] data-[state=open]:animate-fade-in", className)} />;
}

export function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[min(88vh,820px)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-pop focus:outline-none data-[state=open]:animate-pop-in",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-3.5 top-3.5 rounded-md p-1 text-ink-4 transition-colors hover:bg-subtle hover:text-ink">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, title, description, icon }: { className?: string; title: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className={cn("flex gap-3 border-b border-border px-5 py-4 pr-12", className)}>
      {icon && <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-subtle text-ink-2 [&_svg]:size-4">{icon}</div>}
      <div className="min-w-0">
        <DialogPrimitive.Title className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-0.5 text-[13px] text-ink-3">{description}</DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</DialogPrimitive.Description>
        )}
      </div>
    </div>
  );
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("scrollbar-thin flex-1 overflow-y-auto px-5 py-4", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-2 border-t border-border bg-canvas/60 px-5 py-3", className)} {...props} />;
}

// Sheet ------------------------------------------------------------------------

export const Sheet = DialogPrimitive.Root;

export function SheetContent({
  className,
  children,
  width = "max-w-xl",
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { width?: string }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay className="bg-navy/15 backdrop-blur-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-background shadow-drawer focus:outline-none data-[state=open]:animate-slide-in-right",
          width,
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3.5 top-3.5 rounded-md p-1 text-ink-4 transition-colors hover:bg-subtle hover:text-ink">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

// Popover ----------------------------------------------------------------------

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({ className, align = "start", sideOffset = 6, ...props }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn("z-50 w-64 rounded-lg border border-border bg-background p-3 shadow-pop outline-none data-[state=open]:animate-pop-in", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

// Tooltip ----------------------------------------------------------------------

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  if (!content) return <>{children}</>;
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={5} className="z-[60] max-w-xs rounded-md bg-navy px-2 py-1 text-xs text-white shadow-pop data-[state=delayed-open]:animate-fade-in">
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// Dropdown menu ----------------------------------------------------------------

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;

export function DropdownMenuContent({ className, sideOffset = 6, align = "end", ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn("z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-pop data-[state=open]:animate-pop-in", className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

const itemCls =
  "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-2 outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-subtle data-[highlighted]:text-ink data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-ink-4";

export function DropdownMenuItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>) {
  return <DropdownPrimitive.Item className={cn(itemCls, className)} {...props} />;
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem>) {
  return (
    <DropdownPrimitive.CheckboxItem className={cn(itemCls, "pl-7", className)} onSelect={(e) => e.preventDefault()} {...props}>
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownPrimitive.ItemIndicator>
          <Check className="!size-3.5 !text-accent" strokeWidth={2.5} />
        </DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup;

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.RadioItem>) {
  return (
    <DropdownPrimitive.RadioItem className={cn(itemCls, "pl-7", className)} {...props}>
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownPrimitive.ItemIndicator>
          <Check className="!size-3.5 !text-accent" strokeWidth={2.5} />
        </DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn("px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-4", className)} {...props} />;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <DropdownPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}
