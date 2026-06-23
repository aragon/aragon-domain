/**
 * Generic paginated response DTO — the serialized counterpart of the
 * domain `Page<T>` primitive. Reused by any paginated use-case result.
 */
export interface PageDTO<T> {
  metadata: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  };
  data: T[];
}