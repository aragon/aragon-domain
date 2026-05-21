export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

export function createPage<T>(
  items: T[],
  page: number,
  pageSize: number,
  totalRecords: number,
): Page<T> {
  return {
    items,
    page,
    pageSize,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  };
}
