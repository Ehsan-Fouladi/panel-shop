"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function Command({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        "command-root flex min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground",
        className,
      )}
      data-slot="command"
      {...props}
    />
  );
}

type CommandDialogProps = ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
};

function CommandDialog({
  title = "جست‌وجوی داده‌های داشبورد",
  description = "جست‌وجوی محلی در کالاها، مشتریان و تراکنش‌های داشبورد.",
  children,
  className,
  showCloseButton = false,
  onCloseAutoFocus,
  ...dialogProps
}: CommandDialogProps & { children: ReactNode }) {
  return (
    <Dialog {...dialogProps}>
      <DialogContent
        className={cn(
          "search-command-dialog max-w-[640px] overflow-hidden p-0",
          className,
        )}
        id="dashboard-search-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
        showCloseButton={showCloseButton}
      >
        <div className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
        <Command
          className="search-command-root"
          label={title}
          loop
          shouldFilter={false}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      className="command-input-wrapper flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 transition-colors focus-within:bg-muted/50 focus-within:ring-2 focus-within:ring-ring/25 focus-within:ring-offset-2 focus-within:ring-offset-background"
      data-slot="command-input-wrapper"
    >
      <Search
        aria-hidden="true"
        className="command-input-icon shrink-0 text-muted-foreground"
        size={17}
      />
      <CommandPrimitive.Input
        className={cn(
          "command-input-field h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0",
          className,
        )}
        data-slot="command-input"
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn(
        "command-list max-h-[min(60vh,30rem)] overflow-x-hidden overflow-y-auto p-2",
        className,
      )}
      data-slot="command-list"
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className={cn("command-empty", className)}
      data-slot="command-empty"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn("command-group", className)}
      data-slot="command-group"
      {...props}
    />
  );
}

function CommandItem({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn("command-item", className)}
      data-slot="command-item"
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn("command-separator", className)}
      data-slot="command-separator"
      {...props}
    />
  );
}

function CommandShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "ms-auto text-xs tracking-widest text-muted-foreground",
        className,
      )}
      data-slot="command-shortcut"
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
