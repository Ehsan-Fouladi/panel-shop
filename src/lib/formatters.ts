export type CurrencyUnit = "تومان" | "ریال";

let activeCurrencyUnit: CurrencyUnit = "تومان";

export function setCurrencyUnit(unit: CurrencyUnit): void {
  activeCurrencyUnit = unit;
}

export function getCurrencyUnit(): CurrencyUnit {
  return activeCurrencyUnit;
}

function displayedCurrencyValue(value: number): number {
  return activeCurrencyUnit === "ریال" ? value * 10 : value;
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(
    value,
  );
}

export function formatCurrency(value: number): string {
  return `${formatNumber(Math.round(displayedCurrencyValue(value)))} ${activeCurrencyUnit}`;
}

export function formatCompactCurrency(value: number): string {
  const displayValue = displayedCurrencyValue(value);
  const absolute = Math.abs(displayValue);
  const divisor =
    absolute >= 1_000_000_000
      ? 1_000_000_000
      : absolute >= 1_000_000
        ? 1_000_000
        : 1;
  const unit =
    divisor === 1_000_000_000
      ? activeCurrencyUnit === "ریال"
        ? "میلیارد ریال"
        : "میلیارد"
      : divisor === 1_000_000
        ? activeCurrencyUnit === "ریال"
          ? "میلیون ریال"
          : "میلیون"
        : activeCurrencyUnit;
  const digits = divisor === 1 ? 0 : 1;
  const rounded = Number((displayValue / divisor).toFixed(digits));
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: digits }).format(rounded)} ${unit}`;
}

export function formatCompactAxis(value: number): string {
  const displayValue = displayedCurrencyValue(value);
  const absolute = Math.abs(displayValue);
  if (absolute >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(displayValue / 1_000_000_000)}ب`;
  }
  if (absolute >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(displayValue / 1_000_000)}م`;
  }
  return formatNumber(displayValue);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value))}٪`;
}

export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatPercent(value)}`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}
