import { useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SearchRecord } from "@/data/dashboard-data";
import type { DateRange } from "@/lib/dashboard-metrics";
import { addDays, type DateKey, getTodayDateKey } from "@/lib/date";
import { setCurrencyUnit } from "@/lib/formatters";
import { useAppStore } from "@/store/app-store";
import { useRetailStore } from "@/store/retail-store";

export interface DashboardLayoutContext {
  selectedDate: DateKey;
  calendarMode: "jalali" | "gregorian";
  customRange: DateRange;
  onSelectedDateChange: (date: DateKey) => void;
  onCalendarModeChange: (mode: "jalali" | "gregorian") => void;
  onCustomRangeChange: (range: DateRange) => void;
  onSelectRecord: (record: SearchRecord) => void;
}

function recordPath(record: SearchRecord): string {
  switch (record.kind) {
    case "product":
      return `/products/${record.id}`;
    case "sale":
      return `/sales/${record.id}`;
    case "purchase":
      return `/purchases/${record.id}`;
    case "supplier":
      return `/suppliers/${record.id}`;
    case "customer":
      return `/crm?customer=${encodeURIComponent(record.id)}`;
    case "expense":
      return `/expenses?search=${encodeURIComponent(record.reference ?? record.title)}`;
    case "payment":
      return "/credit-book";
  }
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const mainScrollRef = useRef<HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState<DateKey>(() =>
    getTodayDateKey(),
  );
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const today = getTodayDateKey();
    return { start: addDays(today, -29), end: today };
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const calendarMode = useAppStore((state) => state.calendarMode);
  const setCalendarMode = useAppStore((state) => state.setCalendarMode);
  const currency = useRetailStore((state) => state.settings.currency);
  // Set before rendering the route so a direct reload uses the persisted display unit immediately.
  setCurrencyUnit(currency);
  useLayoutEffect(() => {
    if (!location.pathname || !mainScrollRef.current) return;
    mainScrollRef.current.scrollTop = 0;
    mainScrollRef.current.scrollLeft = 0;
  }, [location.pathname]);

  const onSelectRecord = (record: SearchRecord) => navigate(recordPath(record));
  const outletContext: DashboardLayoutContext = {
    selectedDate,
    calendarMode,
    customRange,
    onSelectedDateChange: setSelectedDate,
    onCalendarModeChange: setCalendarMode,
    onCustomRangeChange: setCustomRange,
    onSelectRecord,
  };

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={500}>
      <div className="app-stage flex h-svh w-full bg-[var(--app-canvas)] p-1.5">
        <Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
          <div
            className={`app-frame grid min-h-0 w-full flex-1 gap-1.5 overflow-hidden bg-[var(--app-canvas)] max-md:grid-cols-1 ${sidebarCollapsed ? "grid-cols-[76px_minmax(0,1fr)]" : "grid-cols-[220px_minmax(0,1fr)]"}`}
          >
            <AppSidebar
              collapsed={sidebarCollapsed}
              onNavigate={() => setMobileNavOpen(false)}
              onToggleCollapsed={() =>
                setSidebarCollapsed((current) => !current)
              }
            />
            <SheetContent
              className={`mobile-nav-sheet h-svh w-[min(86vw,300px)] max-w-full overflow-y-auto border-0 bg-sidebar-background p-0 text-foreground shadow-dialog ${sidebarCollapsed ? "" : "is-expanded"}`}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                if (event.currentTarget instanceof HTMLElement)
                  event.currentTarget.focus();
              }}
              side="right"
            >
              <div className="sr-only">
                <SheetTitle>ناوبری اصلی</SheetTitle>
                <SheetDescription>
                  پیوندهای بخش‌های مدیریت فروشگاه.
                </SheetDescription>
              </div>
              <AppSidebar
                collapsed={sidebarCollapsed}
                mobile
                onNavigate={() => setMobileNavOpen(false)}
                onToggleCollapsed={() =>
                  setSidebarCollapsed((current) => !current)
                }
              />
            </SheetContent>
            <div className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-[var(--shell-background)]">
              <AppHeader
                calendarMode={calendarMode}
                onSearchQueryChange={setSearchQuery}
                onSelectRecord={onSelectRecord}
                searchQuery={searchQuery}
                selectedDate={selectedDate}
              />
              <main
                className="dashboard-scroll scrollbar-indicator-hidden min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 md:px-5 xl:px-6"
                id="main-content"
                ref={mainScrollRef}
              >
                <Outlet context={outletContext} />
              </main>
            </div>
          </div>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
