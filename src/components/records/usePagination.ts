import { useCallback, useEffect, useRef, useState } from "react";

export function usePagination<T>(items: readonly T[], pageSize: number) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("Pagination pageSize must be a positive integer.");
  }

  const [requestedPage, setRequestedPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const pageCountRef = useRef(pageCount);
  pageCountRef.current = pageCount;

  const page = Math.min(Math.max(requestedPage, 1), pageCount);
  const setPage = useCallback((nextPage: number) => {
    const normalizedPage = Number.isFinite(nextPage) ? Math.trunc(nextPage) : 1;
    setRequestedPage(
      Math.min(Math.max(normalizedPage, 1), pageCountRef.current),
    );
  }, []);

  useEffect(() => {
    if (requestedPage !== page) setRequestedPage(page);
  }, [page, requestedPage]);

  return {
    page,
    pageCount,
    setPage,
    visible: items.slice((page - 1) * pageSize, page * pageSize),
  };
}
