import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildCalendarDays,
  type CalendarMode,
  type DateKey,
  getCalendarWeekdayLabels,
  getDateLabel,
  getMonthCursor,
  getMonthTitle,
  getTodayDateKey,
  type MonthCursor,
  shiftMonthCursor,
} from "@/lib/date";
import { formatCompactCurrency, formatCount } from "@/lib/formatters";

interface CalendarCardProps {
  selectedDate: DateKey;
  mode: CalendarMode;
  onSelectedDateChange: (date: DateKey) => void;
  onModeChange: (mode: CalendarMode) => void;
  summary: { sales: number; count: number; cashReceived: number };
}

export function CalendarCard({
  selectedDate,
  mode,
  onSelectedDateChange,
  onModeChange,
  summary,
}: CalendarCardProps) {
  const [cursor, setCursor] = useState<MonthCursor>(() =>
    getMonthCursor(selectedDate, mode),
  );
  const today = getTodayDateKey();
  const days = buildCalendarDays(cursor, mode, selectedDate, today);
  const weeks = Array.from({ length: days.length / 7 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );
  const weekdayLabels = getCalendarWeekdayLabels();
  const selectedSummary = summary;

  useEffect(() => {
    setCursor(getMonthCursor(selectedDate, mode));
  }, [selectedDate, mode]);

  const navigateMonth = (amount: number) => {
    setCursor((current) => shiftMonthCursor(current, amount, mode));
  };

  return (
    <Card
      dir="rtl"
      aria-label="تقویم و جمع فروش روز"
      className="panel-card calendar-card grid min-h-[390px] min-w-0 content-start gap-3 rounded-[22px] border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="calendar-card-header flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="calendar-title grid min-w-0 gap-1">
          <span
            aria-atomic="true"
            aria-live="polite"
            className="calendar-month-title text-base font-semibold text-foreground"
          >
            {getMonthTitle(cursor, mode)}
          </span>
          <span className="calendar-mode-label text-[10px] leading-4 text-muted-foreground">
            فروش روزانه بر اساس تاریخ انتخاب‌شده
          </span>
        </div>
        <div className="calendar-header-actions flex flex-wrap items-center gap-1.5">
          <fieldset className="calendar-mode-toggle flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
            <legend className="sr-only">نوع تقویم</legend>
            <button
              aria-pressed={mode === "jalali"}
              className="calendar-mode-button rounded-full px-2.5 py-1 text-[10px] text-muted-foreground transition-colors aria-[pressed=true]:bg-primary aria-[pressed=true]:text-primary-foreground"
              onClick={() => onModeChange("jalali")}
              type="button"
            >
              شمسی
            </button>
            <button
              aria-pressed={mode === "gregorian"}
              className="calendar-mode-button rounded-full px-2.5 py-1 text-[10px] text-muted-foreground transition-colors aria-[pressed=true]:bg-primary aria-[pressed=true]:text-primary-foreground"
              onClick={() => onModeChange("gregorian")}
              type="button"
            >
              میلادی
            </button>
          </fieldset>
          <Button
            aria-label="ماه قبل"
            className="calendar-nav-button h-8 w-8 rounded-full"
            onClick={() => navigateMonth(-1)}
            variant="icon"
            size="icon-sm"
          >
            <ChevronRight aria-hidden="true" size={15} />
          </Button>
          <Button
            aria-label="ماه بعد"
            className="calendar-nav-button h-8 w-8 rounded-full"
            onClick={() => navigateMonth(1)}
            variant="icon"
            size="icon-sm"
          >
            <ChevronLeft aria-hidden="true" size={15} />
          </Button>
        </div>
      </div>

      <table
        aria-label={getMonthTitle(cursor, mode)}
        className="calendar-days-grid w-full table-fixed border-collapse"
      >
        <thead>
          <tr className="calendar-weekdays text-muted-foreground">
            {weekdayLabels.map((label) => (
              <th
                className="calendar-weekday h-7 text-center text-[10px] font-medium"
                key={label}
                scope="col"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.dateKey}>
              {week.map((day) => (
                <td
                  className="calendar-cell p-0.5 text-center"
                  key={day.dateKey}
                >
                  <button
                    aria-current={day.isToday ? "date" : undefined}
                    aria-label={getDateLabel(day.dateKey, mode, true)}
                    aria-pressed={day.isSelected}
                    className={[
                      "calendar-day mx-auto grid h-8 w-8 place-items-center rounded-full text-[11px] tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&.is-outside]:text-muted-foreground/50 [&.is-selected]:bg-primary [&.is-selected]:font-semibold [&.is-selected]:text-primary-foreground [&.is-today:not(.is-selected)]:ring-1 [&.is-today:not(.is-selected)]:ring-primary",
                      !day.isCurrentMonth && "is-outside",
                      day.isSelected && "is-selected",
                      day.isToday && "is-today",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onSelectedDateChange(day.dateKey)}
                    type="button"
                  >
                    {day.label}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div
        aria-live="polite"
        className="calendar-summary flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card-raised/70 p-3"
      >
        <span className="calendar-summary-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-foreground">
          <BarChart3 aria-hidden="true" size={18} />
        </span>
        <div className="calendar-summary-copy min-w-0 flex-1">
          <div className="calendar-summary-main flex flex-wrap items-baseline justify-between gap-2">
            <span className="calendar-summary-label text-xs text-muted-foreground">
              {selectedDate === today
                ? `فروش امروز · ${getDateLabel(today, mode, true)}`
                : `فروش ${getDateLabel(selectedDate, mode, true)}`}
            </span>
            <strong className="calendar-summary-amount text-base font-semibold tabular-nums text-foreground">
              {formatCompactCurrency(selectedSummary.sales)}
            </strong>
          </div>
          <div className="calendar-summary-extra mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
            <span>{formatCount(selectedSummary.count)} فاکتور</span>
            <span>
              دریافت {formatCompactCurrency(selectedSummary.cashReceived)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
