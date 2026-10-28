import type { StateStorage } from "zustand/middleware";

export const STORAGE_ERROR_EVENT = "retail-storage-error";
export const STORAGE_RECOVERED_EVENT = "retail-storage-recovered";
export const RETAIL_STORAGE_KEY = "retail-dashboard-records-v1";
export const APP_PREFERENCES_STORAGE_KEY = "retail-dashboard-preferences";
export const STORAGE_WARNING_TOAST_ID = "retail-storage-warning";

export type StorageFailureOperation =
  "read" | "write" | "remove" | "parse" | "invalid";

export interface StorageFailureEventDetail {
  name: string;
  operation: StorageFailureOperation;
}

export interface StorageHealth {
  readFailure: StorageFailureOperation | null;
  writeFailure: StorageFailureOperation | null;
  writeBlocked: boolean;
}

const healthByName = new Map<string, StorageHealth>();

function getMutableHealth(name: string): StorageHealth {
  let health = healthByName.get(name);
  if (!health) {
    health = { readFailure: null, writeFailure: null, writeBlocked: false };
    healthByName.set(name, health);
  }
  return health;
}

function dispatchStorageEvent(
  eventName: string,
  detail: StorageFailureEventDetail,
): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  )
    return;
  if (typeof CustomEvent === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<StorageFailureEventDetail>(eventName, { detail }),
  );
}

function hasFailure(health: StorageHealth): boolean {
  return Boolean(
    health.readFailure || health.writeFailure || health.writeBlocked,
  );
}

function markFailure(name: string, operation: StorageFailureOperation): void {
  const health = getMutableHealth(name);
  const isReadFailure =
    operation === "read" || operation === "parse" || operation === "invalid";
  const wasAlreadyFailed = isReadFailure
    ? Boolean(health.readFailure)
    : Boolean(health.writeFailure);

  if (isReadFailure) {
    health.readFailure = operation;
    health.writeBlocked = true;
  } else {
    health.writeFailure = operation;
  }

  if (!wasAlreadyFailed) {
    dispatchStorageEvent(STORAGE_ERROR_EVENT, { name, operation });
  }
}

function markSuccess(
  name: string,
  operation: "read" | "write" | "remove",
): void {
  const health = getMutableHealth(name);
  const previouslyFailed = hasFailure(health);

  if (operation === "read") {
    health.readFailure = null;
    health.writeBlocked = false;
  } else {
    health.writeFailure = null;
  }

  if (previouslyFailed && !hasFailure(health)) {
    dispatchStorageEvent(STORAGE_RECOVERED_EVENT, { name, operation });
  }
}

/** Report a JSON parse, migration, or schema failure caught by Zustand during hydration. */
export function reportStorageReadFailure(
  name: string,
  operation: "parse" | "invalid" = "parse",
): void {
  markFailure(name, operation);
}

export function getStorageHealth(name: string): Readonly<StorageHealth> {
  return { ...getMutableHealth(name) };
}

export function getActiveStorageFailures(): StorageFailureEventDetail[] {
  const failures: StorageFailureEventDetail[] = [];
  for (const [name, health] of healthByName) {
    if (health.readFailure)
      failures.push({ name, operation: health.readFailure });
    if (health.writeFailure)
      failures.push({ name, operation: health.writeFailure });
  }
  return failures;
}

export function hasStorageFailures(names?: string[]): boolean {
  const selected = names
    ? names.map((name) => getMutableHealth(name))
    : [...healthByName.values()];
  return selected.some(hasFailure);
}

export function getStorageFailureMessage(
  failures = getActiveStorageFailures(),
): string {
  if (
    failures.some(
      ({ operation }) =>
        operation === "read" ||
        operation === "parse" ||
        operation === "invalid",
    )
  ) {
    return "خواندن دادهٔ ذخیره‌شده ناموفق بود. برای جلوگیری از بازنویسی داده‌های ناشناخته، ذخیرهٔ خودکار متوقف شده است؛ داده را پاک یا بازنشانی نکنید و پس از رفع مشکل برنامه را دوباره بارگذاری کنید.";
  }
  return "ذخیرهٔ تغییرات در مرورگر ناموفق بود. تغییرات این نشست ممکن است پس از بستن یا تازه‌سازی از بین بروند؛ فضای ذخیره‌سازی مرورگر را بررسی و پیش از خروج از دادهٔ فعلی خروجی JSON بگیرید.";
}

export const safeLocalStorage: StateStorage = {
  getItem(name) {
    if (typeof window === "undefined") return null;
    try {
      const value = window.localStorage.getItem(name);
      markSuccess(name, "read");
      return value;
    } catch {
      markFailure(name, "read");
      return null;
    }
  },
  setItem(name, value) {
    if (typeof window === "undefined") return;
    if (getMutableHealth(name).writeBlocked) return;
    try {
      window.localStorage.setItem(name, value);
      markSuccess(name, "write");
    } catch {
      markFailure(name, "write");
    }
  },
  removeItem(name) {
    if (typeof window === "undefined") return;
    if (getMutableHealth(name).writeBlocked) return;
    try {
      window.localStorage.removeItem(name);
      markSuccess(name, "remove");
    } catch {
      markFailure(name, "remove");
    }
  },
};
