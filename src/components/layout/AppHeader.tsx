import {
  Bell,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  type LucideIcon,
  Moon,
  PackageOpen,
  ReceiptText,
  Search,
  ShoppingCart,
  Sun,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type RecordKind,
  type SearchRecord,
  searchDashboardRecords,
} from "@/data/dashboard-data";
import {
  type CalendarMode,
  type DateKey,
  getDateLabel,
  getTodayDateKey,
} from "@/lib/date";
import { formatCurrency } from "@/lib/formatters";
import {
  buildRetailSearchRecords,
  getRetailNotifications,
} from "@/lib/retail-data";
import { useAppStore } from "@/store/app-store";
import { useRetailStore } from "@/store/retail-store";
import { sileo } from "sileo";

const recordIcons: Record<RecordKind, LucideIcon> = {
  product: PackageOpen,
  sale: ShoppingCart,
  purchase: ClipboardList,
  expense: ReceiptText,
  payment: CreditCard,
  customer: UsersRound,
  supplier: CircleDollarSign,
};

interface AppHeaderProps {
  selectedDate: DateKey;
  calendarMode: CalendarMode;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSelectRecord: (record: SearchRecord) => void;
}

function pageHeading(pathname: string): { title: string; subtitle: string } {
  if (pathname === "/")
    return {
      title: "نمای کلی",
      subtitle: "خلاصهٔ فروش، هزینه‌ها و فعالیت فروشگاه",
    };
  if (pathname === "/products/new")
    return { title: "ثبت کالای جدید", subtitle: "مدیریت کالا و موجودی" };
  if (pathname.startsWith("/products/"))
    return {
      title: pathname.endsWith("/edit") ? "ویرایش کالا" : "جزئیات کالا",
      subtitle: "مدیریت کالا و موجودی",
    };
  if (pathname === "/products")
    return {
      title: "کالا و موجودی",
      subtitle: "فهرست کالا، قیمت و وضعیت انبار",
    };
  if (pathname === "/sales/new")
    return { title: "ثبت فروش", subtitle: "فاکتور، پرداخت و ماندهٔ مشتری" };
  if (pathname.startsWith("/sales/"))
    return { title: "جزئیات فروش", subtitle: "فاکتور و رسید محلی" };
  if (pathname === "/sales")
    return { title: "فروش‌ها", subtitle: "فاکتورها و دریافت‌ها" };
  if (pathname === "/purchases/new")
    return { title: "ثبت خرید", subtitle: "سفارش، دریافت کالا و پرداخت" };
  if (pathname.startsWith("/purchases/"))
    return { title: "جزئیات خرید", subtitle: "رسید انبار و بدهی تأمین‌کننده" };
  if (pathname === "/purchases")
    return { title: "خریدها", subtitle: "سفارش‌ها و رسید کالا" };
  if (pathname === "/suppliers/new")
    return { title: "تأمین‌کنندهٔ جدید", subtitle: "دفتر تأمین‌کنندگان" };
  if (pathname.startsWith("/suppliers/"))
    return { title: "جزئیات تأمین‌کننده", subtitle: "سوابق خرید و پرداخت" };
  if (pathname === "/suppliers")
    return { title: "تأمین‌کنندگان", subtitle: "دفتر تماس و مانده‌ها" };
  if (pathname === "/expenses/new")
    return { title: "ثبت هزینه", subtitle: "هزینه‌های عملیاتی" };
  if (pathname === "/expenses")
    return { title: "هزینه‌های جاری", subtitle: "دفتر هزینه‌های عملیاتی" };
  if (pathname === "/financials")
    return {
      title: "تحلیل مالی",
      subtitle: "فروش، بهای تمام‌شده و سود و زیان",
    };
  if (pathname === "/credit-book")
    return {
      title: "دفتر حساب‌های نسیه",
      subtitle: "مطالبات مشتری و بدهی تأمین‌کننده",
    };
  if (pathname === "/crm/campaigns")
    return {
      title: "پویش‌های پیامکی",
      subtitle: "آماده‌سازی و شبیه‌سازی محلی",
    };
  if (pathname === "/crm")
    return { title: "مشتریان", subtitle: "دفتر مشتریان و گروه‌بندی" };
  if (pathname === "/stock-movements")
    return { title: "گردش موجودی", subtitle: "دفتر حسابرسی تغییرات کالا" };
  if (pathname === "/cash-register")
    return { title: "صندوق فروشگاه", subtitle: "بازکردن، بستن و تطبیق نقدی" };
  if (pathname === "/returns")
    return { title: "مرجوعی‌ها", subtitle: "ثبت مرجوعی و بازپرداخت" };
  if (pathname === "/reports")
    return { title: "گزارش‌ها", subtitle: "خروجی‌های قابل فیلتر و محلی" };
  if (pathname === "/settings")
    return { title: "تنظیمات", subtitle: "ترجیحات فروشگاه و داده‌های محلی" };
  return { title: "بخش فروشگاه", subtitle: "مدیریت فروشگاه" };
}

export function AppHeader({
  selectedDate,
  calendarMode,
  searchQuery,
  onSearchQueryChange,
  onSelectRecord,
}: AppHeaderProps) {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const retailData = useRetailStore((state) => state);
  const today = getTodayDateKey();
  const records = useMemo(
    () => buildRetailSearchRecords(retailData),
    [retailData],
  );
  const notifications = useMemo(
    () => getRetailNotifications(retailData, today),
    [retailData, today],
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const heading = pageHeading(location.pathname);
  const unreadNotifications = notifications.filter(
    (item) => !readNotificationIds.includes(item.id),
  );
  const searchResults = useMemo(
    () => searchDashboardRecords(searchQuery, 7, records),
    [records, searchQuery],
  );
  const searchGroups = useMemo(() => {
    const recordsByKind = new Map<string, SearchRecord[]>();
    for (const record of searchResults) {
      const group = recordsByKind.get(record.kindLabel) ?? [];
      group.push(record);
      recordsByKind.set(record.kindLabel, group);
    }
    return Array.from(recordsByKind, ([label, groupRecords]) => ({
      label,
      records: groupRecords,
    }));
  }, [searchResults]);
  const dateLabel = getDateLabel(selectedDate, calendarMode, true);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  const handleSelectRecord = (record: SearchRecord) => {
    onSelectRecord(record);
    onSearchQueryChange("");
    setSearchOpen(false);
    setNotificationsOpen(false);
  };
  const markAllRead = () => {
    if (unreadNotifications.length === 0) return;
    setReadNotificationIds(notifications.map((item) => item.id));
    sileo.success({
      title: "اعلان‌ها خوانده‌شده علامت‌گذاری شدند.",
      duration: 3000,
    });
  };
  const markNotificationRead = (item: (typeof notifications)[number]) => {
    setReadNotificationIds((current) =>
      current.includes(item.id) ? current : [...current, item.id],
    );
    handleSelectRecord(item.record);
  };

  return (
    <header className="app-header sticky top-0 z-30 flex min-h-[76px] w-full items-center justify-between gap-3 bg-transparent px-4 py-4 sm:gap-4 sm:px-6">
      <div className="header-brand-row flex min-w-0 items-center gap-3">
        <SheetTrigger asChild>
          <Button
            aria-label="باز کردن منوی ناوبری"
            className="header-mobile-menu md:hidden"
            variant="icon"
            size="icon-sm"
          >
            <ClipboardList aria-hidden="true" size={19} />
          </Button>
        </SheetTrigger>
        <div className="header-title-block min-w-0 space-y-0.5">
          <h1 className="header-title truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {heading.title}
          </h1>
          <p className="header-subtitle hidden max-w-[38rem] truncate text-xs text-muted-foreground sm:block">
            {heading.subtitle}
          </p>
        </div>
      </div>
      <div className="search-root min-w-0">
        <Button
          aria-controls="dashboard-search-dialog"
          aria-expanded={searchOpen}
          aria-haspopup="dialog"
          aria-label="جست‌وجوی کالا، مشتری یا تراکنش"
          className="search-control min-w-0 search-trigger w-2xl gap-2 rounded-full border border-border bg-control px-4 text-muted-foreground hover:text-foreground max-lg:h-10 max-lg:w-10 max-lg:px-0"
          onClick={() => setSearchOpen(true)}
          variant="ghost"
          size="default"
        >
          <Search
            aria-hidden="true"
            className="search-control-icon shrink-0"
            size={16}
          />
          <span className="search-trigger-label min-w-0 flex-1 truncate text-start max-lg:hidden">
            {searchQuery || "جست‌وجو در داده‌ها"}
          </span>
        </Button>
      </div>
      <div className="header-tools flex shrink-0 items-center gap-2 sm:gap-3">
        <CommandDialog
          description="در داده‌های محلی فروشگاه جست‌وجو کنید و برای بازکردن رکورد نتیجه را انتخاب کنید."
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document
              .querySelector<HTMLButtonElement>(".search-trigger")
              ?.focus();
          }}
          onOpenChange={setSearchOpen}
          open={searchOpen}
          title="جست‌وجوی داده‌های فروشگاه"
        >
          <div className="search-command-input-row flex items-center gap-2 border-b border-border px-3 py-3">
            <CommandInput
              aria-label="جست‌وجوی کالا، مشتری یا تراکنش"
              autoComplete="off"
              onValueChange={onSearchQueryChange}
              placeholder="جست‌وجو در کالاها، مشتریان و تراکنش‌ها"
              ref={searchInputRef}
              value={searchQuery}
            />
            <Button
              aria-label={
                searchQuery.length > 0 ? "پاک کردن جست‌وجو" : "بستن جست‌وجو"
              }
              className="search-command-clear h-8 w-8 rounded-lg"
              onClick={() => {
                if (searchQuery.length > 0) {
                  onSearchQueryChange("");
                  window.requestAnimationFrame(() =>
                    searchInputRef.current?.focus(),
                  );
                  return;
                }
                setSearchOpen(false);
              }}
              variant="ghost"
              size="icon-sm"
            >
              <X aria-hidden="true" size={14} />
            </Button>
          </div>
          <div
            aria-live="polite"
            className="search-results-heading flex items-center justify-between px-4 py-2 text-[10px] text-muted-foreground"
          >
            <span>نتایج جست‌وجوی محلی</span>
            <span>
              {searchQuery.trim().length >= 2
                ? `${searchResults.length} مورد`
                : ""}
            </span>
          </div>
          <CommandList
            aria-label="نتایج جست‌وجو"
            className="search-command-list max-h-[min(62vh,34rem)]"
            id="dashboard-search-results"
          >
            {searchGroups.length === 0 ? (
              <CommandEmpty className="search-empty px-6 py-10 text-center text-xs leading-6 text-muted-foreground">
                {searchQuery.trim().length < 2
                  ? "برای شروع جست‌وجو، دست‌کم دو نویسه وارد کنید."
                  : "موردی با این عبارت در داده‌های محلی پیدا نشد."}
              </CommandEmpty>
            ) : (
              searchGroups.map((group) => (
                <CommandGroup heading={group.label} key={group.label}>
                  {group.records.map((record) => {
                    const Icon = recordIcons[record.kind];
                    return (
                      <CommandItem
                        className="search-result flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm search-command-item data-[selected=true]:bg-accent"
                        key={`${record.kind}-${record.id}`}
                        onSelect={() => handleSelectRecord(record)}
                        value={`${record.kind}-${record.id} ${record.title} ${record.subtitle}`}
                      >
                        <span className="search-result-icon grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <Icon aria-hidden="true" size={16} />
                        </span>
                        <span className="search-result-copy grid min-w-0 flex-1 gap-0.5">
                          <span className="search-result-title truncate text-xs font-medium text-foreground">
                            {record.title}
                          </span>
                          <span className="search-result-subtitle truncate text-[10px] text-muted-foreground">
                            {record.amount !== undefined
                              ? `${record.subtitle} · ${formatCurrency(record.amount)}`
                              : record.subtitle}
                          </span>
                        </span>
                        <span className="search-result-type shrink-0 rounded-full bg-muted px-2 py-1 text-[9px] text-muted-foreground">
                          {record.kindLabel}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            )}
          </CommandList>
          <div className="search-command-footer flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <span>↑ ↓ برای پیمایش</span>
            <span>Enter برای انتخاب</span>
            <span>Esc برای بستن</span>
          </div>
        </CommandDialog>
        <div
          aria-live="polite"
          className="header-date-context hidden items-center gap-2 whitespace-nowrap text-xs text-muted-foreground lg:flex"
        >
          <CalendarDays aria-hidden="true" size={15} />
          <span>{dateLabel}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={
                theme === "dark"
                  ? "فعال‌کردن پوستهٔ روشن"
                  : "فعال‌کردن پوستهٔ تیره"
              }
              className="header-icon-button relative rounded-full"
              onClick={toggleTheme}
              variant="icon"
              size="icon"
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" size={17} />
              ) : (
                <Moon aria-hidden="true" size={17} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {theme === "dark" ? "پوستهٔ روشن" : "پوستهٔ تیره"}
          </TooltipContent>
        </Tooltip>
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button
              aria-label={`اعلان‌ها، ${unreadNotifications.length} خوانده‌نشده`}
              className="header-icon-button relative rounded-full"
              variant="icon"
              size="icon"
            >
              <Bell aria-hidden="true" size={17} />
              {unreadNotifications.length > 0 && (
                <span className="header-notification-dot absolute end-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-[var(--shell-background)]" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            aria-labelledby="notification-popover-title"
            className="notification-popover w-[min(360px,calc(100vw-24px))] p-0"
            side="bottom"
          >
            <div className="notification-header flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2
                className="notification-title text-sm font-semibold text-foreground"
                id="notification-popover-title"
              >
                اعلان‌ها
              </h2>
              <button
                className="notification-read-all text-[10px] text-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                disabled={unreadNotifications.length === 0}
                onClick={markAllRead}
                type="button"
              >
                همه خوانده شد
              </button>
            </div>
            {notifications.length > 0 ? (
              <div className="notification-list max-h-[min(60vh,28rem)] overflow-y-auto p-2">
                {notifications.map((item) => {
                  const isRead = readNotificationIds.includes(item.id);
                  return (
                    <button
                      className={`notification-item flex w-full items-start gap-2.5 rounded-xl p-3 text-start transition-colors hover:bg-muted/60 [&.is-read]:opacity-60${isRead ? " is-read" : ""}`}
                      key={item.id}
                      onClick={() => markNotificationRead(item)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="notification-item-dot mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                      />
                      <span className="notification-item-copy grid min-w-0 gap-1">
                        <span className="notification-item-title text-xs font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="notification-item-description text-[10px] leading-5 text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="notification-empty rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs leading-6 text-muted-foreground">
                اعلان تازه‌ای برای نمایش وجود ندارد.
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
