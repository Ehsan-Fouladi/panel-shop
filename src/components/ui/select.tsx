import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  type ComponentProps,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  id: string;
  triggerId: string;
  listboxId: string;
  value: string;
  labelByValue: Map<string, string>;
  open: boolean;
  disabled: boolean;
  dir: "rtl" | "ltr";
  activeValue: string | null;
  setActiveValue: (value: string | null) => void;
  setOpen: (open: boolean) => void;
  selectValue: (value: string) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  portalContainer: HTMLElement | null;
  setPortalContainer: (container: HTMLElement | null) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(): SelectContextValue {
  const context = useContext(SelectContext);
  if (!context)
    throw new Error("Select parts must be rendered inside <Select>.");
  return context;
}

function childText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : "",
    )
    .join("")
    .trim();
}

function collectOptions(
  children: ReactNode,
  options = new Map<string, string>(),
): Map<string, string> {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; value?: string }>(child))
      return;
    if (child.type === SelectItem && typeof child.props.value === "string") {
      options.set(child.props.value, childText(child.props.children));
      return;
    }
    collectOptions(child.props.children, options);
  });
  return options;
}

export interface SelectProps {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dir?: "rtl" | "ltr";
  disabled?: boolean;
}

/**
 * Non-modal, popover-backed select. Unlike Radix Select, opening the listbox does
 * not lock document scrolling; dialogs and sheets keep their own modal locking.
 */
export function Select({
  children,
  value,
  defaultValue = "",
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  dir = "rtl",
  disabled = false,
}: SelectProps) {
  const id = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelByValue = useMemo(() => collectOptions(children), [children]);
  const selectedValue = value ?? uncontrolledValue;
  const isOpen = open ?? uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
      if (!next) setActiveValue(null);
    },
    [onOpenChange, open],
  );

  const selectValue = useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    },
    [onValueChange, setOpen, value],
  );

  const context: SelectContextValue = {
    id,
    triggerId: `${id}-trigger`,
    listboxId: `${id}-listbox`,
    value: selectedValue,
    labelByValue,
    open: isOpen,
    disabled,
    dir,
    activeValue,
    setActiveValue,
    setOpen,
    selectValue,
    triggerRef,
    portalContainer,
    setPortalContainer,
  };

  return (
    <div className="contents" dir={dir}>
      <SelectContext.Provider value={context}>
        <PopoverPrimitive.Root
          modal={false}
          onOpenChange={setOpen}
          open={isOpen}
        >
          {children}
        </PopoverPrimitive.Root>
      </SelectContext.Provider>
    </div>
  );
}

export function SelectGroup({ children, ...props }: ComponentProps<"div">) {
  return <div {...props}>{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labelByValue } = useSelectContext();
  const label = labelByValue.get(value) ?? value;
  return (
    <span
      className={cn(
        "select-value min-w-0 flex-1 truncate text-start",
        !label && "text-muted-foreground",
      )}
    >
      {label || placeholder || "انتخاب کنید"}
    </span>
  );
}

export function SelectTrigger({
  className,
  children,
  disabled,
  onKeyDown,
  ...props
}: ComponentProps<"button">) {
  const context = useSelectContext();
  const isDisabled = disabled ?? context.disabled;
  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      context.triggerRef.current = node;
      context.setPortalContainer(
        node?.closest<HTMLElement>('[role="dialog"]') ?? null,
      );
    },
    [context.setPortalContainer, context.triggerRef],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || isDisabled) return;
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      event.preventDefault();
      const values = Array.from(context.labelByValue.keys());
      const target =
        event.key === "Home"
          ? values[0]
          : event.key === "End"
            ? values.at(-1)
            : context.value || values[0];
      context.setActiveValue(target ?? null);
      context.setOpen(true);
    }
  };

  return (
    <PopoverPrimitive.Trigger asChild>
      <button
        aria-activedescendant={
          context.open && context.activeValue
            ? `${context.listboxId}-option-${encodeURIComponent(context.activeValue)}`
            : undefined
        }
        aria-controls={context.listboxId}
        aria-expanded={context.open}
        aria-haspopup="listbox"
        className={cn(
          "select-trigger inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-control px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        data-slot="select-trigger"
        data-state={context.open ? "open" : "closed"}
        dir={context.dir}
        disabled={isDisabled}
        id={props.id ?? context.triggerId}
        onKeyDown={handleKeyDown}
        ref={setTriggerRef}
        role="combobox"
        type="button"
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
          size={14}
        />
      </button>
    </PopoverPrimitive.Trigger>
  );
}

interface SelectContentProps extends ComponentProps<
  typeof PopoverPrimitive.Content
> {
  position?: "popper" | "item-aligned";
}

export function SelectContent({
  align = "start",
  children,
  className,
  position = "popper",
  side = "bottom",
  sideOffset = 4,
  onKeyDown,
  onOpenAutoFocus,
  ...props
}: SelectContentProps) {
  const context = useSelectContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const typeaheadBufferRef = useRef("");
  const typeaheadTimerRef = useRef<number | null>(null);
  const optionValues = useMemo(
    () => Array.from(context.labelByValue.keys()),
    [context.labelByValue],
  );

  useEffect(
    () => () => {
      if (typeaheadTimerRef.current !== null)
        window.clearTimeout(typeaheadTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!context.open) return;
    const firstValue = context.value || optionValues[0] || null;
    const activeValue = context.activeValue ?? firstValue;
    context.setActiveValue(activeValue);
    window.requestAnimationFrame(() => {
      if (!activeValue) return;
      const optionId = `${context.listboxId}-option-${encodeURIComponent(activeValue)}`;
      contentRef.current
        ?.querySelector<HTMLButtonElement>(`#${CSS.escape(optionId)}`)
        ?.focus();
    });
  }, [
    context.activeValue,
    context.listboxId,
    context.open,
    context.setActiveValue,
    context.value,
    optionValues,
  ]);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const options = Array.from(
      contentRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="option"]:not([aria-disabled="true"])',
      ) ?? [],
    );
    if (!options.length) return;
    const currentIndex = options.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown")
      nextIndex = (currentIndex + 1 + options.length) % options.length;
    else if (event.key === "ArrowUp")
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      typeaheadBufferRef.current += event.key.toLocaleLowerCase("fa");
      if (typeaheadTimerRef.current !== null)
        window.clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = window.setTimeout(() => {
        typeaheadBufferRef.current = "";
        typeaheadTimerRef.current = null;
      }, 700);
      const query = typeaheadBufferRef.current;
      const ordered = [
        ...options.slice(currentIndex + 1),
        ...options.slice(0, currentIndex + 1),
      ];
      const match = ordered.find((option) =>
        (option.textContent ?? "")
          .trim()
          .toLocaleLowerCase("fa")
          .startsWith(query),
      );
      if (!match) return;
      event.preventDefault();
      match.focus();
      return;
    } else return;
    event.preventDefault();
    options[nextIndex]?.focus();
  };

  return (
    <PopoverPrimitive.Portal container={context.portalContainer ?? undefined}>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          "select-content z-50 max-h-[min(18rem,var(--radix-popover-content-available-height))] min-w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-popover outline-none",
          className,
        )}
        data-position={position}
        data-slot="select-content"
        dir={context.dir}
        aria-labelledby={context.triggerRef.current?.id}
        id={context.listboxId}
        onKeyDown={moveFocus}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          onOpenAutoFocus?.(event);
        }}
        ref={contentRef}
        role="listbox"
        side={side}
        sideOffset={sideOffset}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  disabled = false,
  onClick,
  onFocus,
  onPointerMove,
  value,
  ...props
}: ComponentProps<"button"> & { value: string }) {
  const context = useSelectContext();
  const selected = value === context.value;
  const highlighted = value === context.activeValue;
  const optionId = `${context.listboxId}-option-${encodeURIComponent(value)}`;
  const isDisabled = disabled || context.disabled;

  return (
    <button
      aria-disabled={isDisabled || undefined}
      aria-selected={selected}
      className={cn(
        "select-item relative flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 pe-9 text-start text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
        highlighted && "bg-accent",
        className,
      )}
      data-highlighted={highlighted || undefined}
      data-slot="select-item"
      data-value={value}
      disabled={isDisabled}
      id={optionId}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        context.selectValue(value);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        context.setActiveValue(value);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (!isDisabled) context.setActiveValue(value);
      }}
      role="option"
      type="button"
      {...props}
    >
      <span className="select-item-text min-w-0 flex-1">{children}</span>
      {selected && (
        <span className="select-item-indicator pointer-events-none absolute end-2 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center text-foreground">
          <Check aria-hidden="true" size={13} />
        </span>
      )}
    </button>
  );
}
