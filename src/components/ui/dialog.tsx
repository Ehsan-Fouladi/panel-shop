import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ComponentProps, useRef } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  onEscapeKeyDown,
  onOpenAutoFocus,
  onCloseAutoFocus,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-0 z-[71] m-auto h-fit max-h-[calc(100svh-28px)] w-[calc(100vw-28px)] max-w-[460px] overflow-y-auto rounded-3xl border border-border bg-popover p-5 text-popover-foreground shadow-dialog outline-none sm:p-6",
          className,
        )}
        {...props}
        aria-modal="true"
        onOpenAutoFocus={(event) => {
          const activeElement = document.activeElement;
          previouslyFocusedRef.current =
            activeElement instanceof HTMLElement &&
            activeElement !== document.body
              ? activeElement
              : null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          const previouslyFocused = previouslyFocusedRef.current;
          if (previouslyFocused?.isConnected) {
            event.preventDefault();
            previouslyFocused.focus({ preventScroll: true });
          }
        }}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event);
          if (event.defaultPrevented) return;
          const target = event.target;
          const picker =
            target instanceof Element
              ? target.closest(".doran-datepicker__popover")
              : null;
          const dialog =
            target instanceof Element
              ? target.closest('[role="dialog"]')
              : null;
          if (picker || dialog?.querySelector(".doran-datepicker__popover"))
            event.preventDefault();
        }}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            aria-label="بستن پنجره"
            className="absolute left-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}
