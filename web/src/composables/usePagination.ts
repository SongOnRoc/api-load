import { ref } from "vue";

interface PaginationOptions {
  initialPageSize?: number;
  initialPage?: number;
}

/**
 * 通用分页状态 composable
 * 统一 KeyTable / SubGroupTable / LogTable 的分页逻辑
 */
export function usePagination(options: PaginationOptions = {}) {
  const currentPage = ref(options.initialPage ?? 1);
  const pageSize = ref(options.initialPageSize ?? 20);
  const total = ref(0);
  const totalPages = ref(0);

  function goToPage(page: number) {
    currentPage.value = page;
  }

  function changePageSize(size: number) {
    pageSize.value = size;
    currentPage.value = 1;
  }

  function resetToFirstPage() {
    currentPage.value = 1;
  }

  function setTotal(totalItems: number, computedTotalPages?: number) {
    total.value = totalItems;
    totalPages.value = computedTotalPages ?? Math.ceil(totalItems / pageSize.value);
  }

  return {
    currentPage,
    pageSize,
    total,
    totalPages,
    goToPage,
    changePageSize,
    resetToFirstPage,
    setTotal,
  };
}
