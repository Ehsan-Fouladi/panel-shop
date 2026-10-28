import { useEffect } from "react";
import {
  getActiveStorageFailures,
  getStorageFailureMessage,
  STORAGE_ERROR_EVENT,
  STORAGE_RECOVERED_EVENT,
  STORAGE_WARNING_TOAST_ID,
} from "@/lib/safe-storage";
import { sileo } from "sileo";

function showStorageWarning(): void {
  const failures = getActiveStorageFailures();
  if (failures.length) {
    sileo.error({ title: getStorageFailureMessage(failures), duration: 3000 });
    // toast.error(getStorageFailureMessage(failures), {
    //   id: STORAGE_WARNING_TOAST_ID,
    //   duration: 10_000,
    // });
  } else {
    sileo.dismiss(STORAGE_WARNING_TOAST_ID);
  }
}

export function StorageErrorNotifier() {
  useEffect(() => {
    const onStorageError = () => showStorageWarning();
    const onStorageRecovered = () => showStorageWarning();
    window.addEventListener(STORAGE_ERROR_EVENT, onStorageError);
    window.addEventListener(STORAGE_RECOVERED_EVENT, onStorageRecovered);
    showStorageWarning();
    return () => {
      window.removeEventListener(STORAGE_ERROR_EVENT, onStorageError);
      window.removeEventListener(STORAGE_RECOVERED_EVENT, onStorageRecovered);
    };
  }, []);
  return null;
}
