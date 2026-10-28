import {
  getActiveStorageFailures,
  getStorageFailureMessage,
  STORAGE_WARNING_TOAST_ID,
} from "@/lib/safe-storage";
import { sileo } from "sileo";

/** Only announce success when every persisted browser store is currently writable. */
export function notifyPersistedMutation(
  message: string,
  variant: "success" | "info" = "success",
): void {
  const failures = getActiveStorageFailures();
  if (failures.length) {
    sileo.error({ title: getStorageFailureMessage(failures), duration: 3000 });
    // toast.error(getStorageFailureMessage(failures), {
    //   id: STORAGE_WARNING_TOAST_ID,
    //   duration: 10_000,
    // });
    return;
  }
  if (variant === "info") sileo.info({ title: message, duration: 3000 });
  else sileo.success({ title: message, duration: 3000 });
}
