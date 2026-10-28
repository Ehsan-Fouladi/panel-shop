import { DoranDate, faIR, toPersianDigits } from "@doranjs/core";

export type CalendarMode = "jalali" | "gregorian";
export type DateKey = string;

export interface MonthCursor {
  year: number;
  month: number;
}

export interface CalendarDay {
  dateKey: DateKey;
  dayNumber: number;
  label: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
}

export const APP_TIME_ZONE = "Asia/Tehran";

/** Current Gregorian date key in the app's configured time zone. */
export function getTodayDateKey(instant: Date = new Date()): DateKey {
  return dateKeyFromDoran(
    DoranDate.fromGregorian(instant, { timeZone: APP_TIME_ZONE, locale: faIR }),
  );
}

const persianWeekdays = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];
const shortPersianWeekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function toDoranDate(dateKey: DateKey): DoranDate {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    throw new RangeError(`Invalid date key: ${dateKey}`);
  }

  return DoranDate.fromGregorianParts(
    { year, month, day, hour: 12 },
    { timeZone: APP_TIME_ZONE, locale: faIR },
  );
}

export function dateKeyFromDoran(date: DoranDate): DateKey {
  return date.formatGregorian("YYYY-MM-DD");
}

export function dateKeyFromParts(
  year: number,
  month: number,
  day: number,
): DateKey {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateKey(dateKey: DateKey): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

export function addDays(dateKey: DateKey, amount: number): DateKey {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return dateKeyFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function compareDateKeys(left: DateKey, right: DateKey): number {
  return left.localeCompare(right);
}

export function daysBetween(start: DateKey, end: DateKey): number {
  const left = new Date(`${start}T12:00:00.000Z`).getTime();
  const right = new Date(`${end}T12:00:00.000Z`).getTime();
  return Math.round((right - left) / 86_400_000);
}

export function getMonthCursor(
  dateKey: DateKey,
  mode: CalendarMode,
): MonthCursor {
  if (mode === "jalali") {
    const date = toDoranDate(dateKey);
    return { year: date.year, month: date.month };
  }

  const { year, month } = parseDateKey(dateKey);
  return { year, month };
}

export function getYearStart(dateKey: DateKey, mode: CalendarMode): DateKey {
  if (mode === "jalali") {
    const { year } = toDoranDate(dateKey);
    return dateKeyFromDoran(
      DoranDate.fromJalali(year, 1, 1, {
        timeZone: APP_TIME_ZONE,
        locale: faIR,
      }),
    );
  }

  const { year } = parseDateKey(dateKey);
  return dateKeyFromParts(year, 1, 1);
}

export function getMonthStart(
  cursor: MonthCursor,
  mode: CalendarMode,
): DateKey {
  if (mode === "jalali") {
    return dateKeyFromDoran(
      DoranDate.fromJalali(cursor.year, cursor.month, 1, {
        timeZone: APP_TIME_ZONE,
        locale: faIR,
      }),
    );
  }

  return dateKeyFromParts(cursor.year, cursor.month, 1);
}

export function getMonthEnd(cursor: MonthCursor, mode: CalendarMode): DateKey {
  if (mode === "jalali") {
    const first = DoranDate.fromJalali(cursor.year, cursor.month, 1, {
      timeZone: APP_TIME_ZONE,
      locale: faIR,
    });
    return dateKeyFromDoran(first.addMonths(1).addDays(-1));
  }

  const nextMonth = new Date(Date.UTC(cursor.year, cursor.month, 1, 12));
  nextMonth.setUTCDate(0);
  return dateKeyFromParts(
    nextMonth.getUTCFullYear(),
    nextMonth.getUTCMonth() + 1,
    nextMonth.getUTCDate(),
  );
}

export function shiftDateByMonth(
  dateKey: DateKey,
  amount: number,
  mode: CalendarMode,
): DateKey {
  if (mode === "jalali") {
    return dateKeyFromDoran(toDoranDate(dateKey).addMonths(amount));
  }

  const { year, month, day } = parseDateKey(dateKey);
  const targetFirst = new Date(Date.UTC(year, month - 1 + amount, 1, 12));
  const lastDay = new Date(
    Date.UTC(
      targetFirst.getUTCFullYear(),
      targetFirst.getUTCMonth() + 1,
      0,
      12,
    ),
  ).getUTCDate();
  return dateKeyFromParts(
    targetFirst.getUTCFullYear(),
    targetFirst.getUTCMonth() + 1,
    Math.min(day, lastDay),
  );
}

export function shiftDateByYear(
  dateKey: DateKey,
  amount: number,
  mode: CalendarMode,
): DateKey {
  if (mode === "jalali") {
    return dateKeyFromDoran(toDoranDate(dateKey).addYears(amount));
  }

  const { year, month, day } = parseDateKey(dateKey);
  const targetYear = year + amount;
  const lastDay = new Date(Date.UTC(targetYear, month, 0, 12)).getUTCDate();
  return dateKeyFromParts(targetYear, month, Math.min(day, lastDay));
}

export function shiftMonthCursor(
  cursor: MonthCursor,
  amount: number,
  mode: CalendarMode,
): MonthCursor {
  if (mode === "jalali") {
    const first = DoranDate.fromJalali(cursor.year, cursor.month, 1, {
      timeZone: APP_TIME_ZONE,
      locale: faIR,
    }).addMonths(amount);
    return { year: first.year, month: first.month };
  }

  const shifted = new Date(
    Date.UTC(cursor.year, cursor.month - 1 + amount, 1, 12),
  );
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function getMonthLength(
  cursor: MonthCursor,
  mode: CalendarMode,
): number {
  if (mode === "jalali") {
    return DoranDate.fromJalali(cursor.year, cursor.month, 1, {
      timeZone: APP_TIME_ZONE,
      locale: faIR,
    }).daysInMonth;
  }

  return new Date(Date.UTC(cursor.year, cursor.month, 0, 12)).getUTCDate();
}

export function getMonthTitle(cursor: MonthCursor, mode: CalendarMode): string {
  if (mode === "jalali") {
    return DoranDate.fromJalali(cursor.year, cursor.month, 1, {
      timeZone: APP_TIME_ZONE,
      locale: faIR,
    }).format("MMMM YYYY", { digits: "persian" });
  }

  const date = new Date(Date.UTC(cursor.year, cursor.month - 1, 1, 12));
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getMonthLabel(cursor: MonthCursor, mode: CalendarMode): string {
  if (mode === "jalali") {
    return DoranDate.fromJalali(cursor.year, cursor.month, 1, {
      timeZone: APP_TIME_ZONE,
      locale: faIR,
    }).format("MMM", { digits: "persian" });
  }

  const date = new Date(Date.UTC(cursor.year, cursor.month - 1, 1, 12));
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function getDateLabel(
  dateKey: DateKey,
  mode: CalendarMode,
  includeYear = false,
): string {
  if (mode === "jalali") {
    const format = includeYear ? "D MMMM YYYY" : "D MMMM";
    return toDoranDate(dateKey).format(format, { digits: "persian" });
  }

  const date = new Date(`${dateKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

export function getWeekdayIndex(dateKey: DateKey): number {
  return toDoranDate(dateKey).dayOfWeek;
}

export function getWeekdayLabel(dateKey: DateKey, abbreviated = false): string {
  const index = getWeekdayIndex(dateKey);
  return abbreviated ? shortPersianWeekdays[index] : persianWeekdays[index];
}

export function buildCalendarDays(
  cursor: MonthCursor,
  mode: CalendarMode,
  selectedDate: DateKey,
  today: DateKey,
): CalendarDay[] {
  const monthStart = getMonthStart(cursor, mode);
  const monthLength = getMonthLength(cursor, mode);

  if (mode === "jalali") {
    const first = DoranDate.fromJalali(cursor.year, cursor.month, 1, {
      timeZone: APP_TIME_ZONE,
      locale: faIR,
    });
    const offset = first.dayOfWeek;
    const cellCount = Math.max(35, Math.ceil((offset + monthLength) / 7) * 7);

    return Array.from({ length: cellCount }, (_, index) => {
      const day = first.addDays(index - offset);
      const dateKey = dateKeyFromDoran(day);
      return {
        dateKey,
        dayNumber: day.day,
        label: day.format("D", { digits: "persian" }),
        isCurrentMonth: day.year === cursor.year && day.month === cursor.month,
        isSelected: dateKey === selectedDate,
        isToday: dateKey === today,
      };
    });
  }

  const first = new Date(`${monthStart}T12:00:00.000Z`);
  const offset = (first.getUTCDay() + 1) % 7;
  const cellCount = Math.max(35, Math.ceil((offset + monthLength) / 7) * 7);

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(
      Date.UTC(cursor.year, cursor.month - 1, 1 + index - offset, 12),
    );
    const dateKey = dateKeyFromParts(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
    const dayNumber = date.getUTCDate();
    return {
      dateKey,
      dayNumber,
      label: toPersianDigits(String(dayNumber)),
      isCurrentMonth:
        date.getUTCMonth() + 1 === cursor.month &&
        date.getUTCFullYear() === cursor.year,
      isSelected: dateKey === selectedDate,
      isToday: dateKey === today,
    };
  });
}

export function getCalendarWeekdayLabels(): string[] {
  return shortPersianWeekdays;
}

export function getDateKeyRange(from: DateKey, to: DateKey): DateKey[] {
  if (compareDateKeys(from, to) > 0) {
    return [];
  }

  const days = daysBetween(from, to);
  return Array.from({ length: days + 1 }, (_, index) => addDays(from, index));
}
