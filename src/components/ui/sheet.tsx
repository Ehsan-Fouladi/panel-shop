import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export function SheetOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "sheet-overlay fixed inset-0 z-[70] bg-black/55 backdrop-blur-[2px]",
        className,
      )}
      data-slot="sheet-overlay"
      {...props}
    />
  );
}

export function SheetContent({
  children,
  className,
  showCloseButton = false,
  side = "right",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const sideClasses = {
    top: "inset-x-0 top-0 max-h-[85svh] w-full border-b",
    right: "inset-y-0 right-0 h-full max-w-[90vw] border-s",
    bottom: "inset-x-0 bottom-0 max-h-[85svh] w-full border-t",
    left: "inset-y-0 left-0 h-full max-w-[90vw] border-e",
  }[side];

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          "sheet-content fixed z-[71] overflow-y-auto border-border bg-card text-card-foreground shadow-dialog outline-none",
          sideClasses,
          className,
        )}
        data-side={side}
        data-slot="sheet-content"
        {...props}
        aria-modal="true"
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            aria-label="بستن پنجره"
            className="sheet-close-button absolute start-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" size={16} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "sheet-title text-base font-semibold text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "sheet-description text-sm leading-6 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
