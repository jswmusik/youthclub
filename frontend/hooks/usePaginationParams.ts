'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook for managing pagination state via URL parameters.
 * This ensures pagination state persists across:
 * - Browser refresh
 * - Navigation to edit/create pages and back
 * - Item deletion
 * 
 * Usage:
 * const { currentPage, setPage, buildUrlWithParams, updateUrl } = usePaginationParams();
 */
export function usePaginationParams(pageSize: number = 10) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Get current page from URL
  const currentPage = Number(searchParams.get('page')) || 1;

  // Build URL preserving all current query params
  const buildUrlWithParams = useCallback((path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  }, [searchParams]);

  // Update a single URL param (resets page to 1 for filter changes)
  const updateUrl = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when any filter changes (except page itself)
    if (key !== 'page') {
      params.set('page', '1');
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Navigate to a path while preserving query params
  const navigateWithParams = useCallback((path: string) => {
    router.push(buildUrlWithParams(path));
  }, [router, buildUrlWithParams]);

  // Change page
  const setPage = useCallback((page: number) => {
    updateUrl('page', page.toString());
  }, [updateUrl]);

  // Handle page change (for pagination buttons)
  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Calculate pagination values
  const getOffset = useCallback(() => {
    return (currentPage - 1) * pageSize;
  }, [currentPage, pageSize]);

  const getTotalPages = useCallback((totalCount: number) => {
    return Math.ceil(totalCount / pageSize);
  }, [pageSize]);

  return {
    currentPage,
    pageSize,
    searchParams,
    pathname,
    buildUrlWithParams,
    updateUrl,
    navigateWithParams,
    setPage,
    handlePageChange,
    getOffset,
    getTotalPages,
  };
}

export default usePaginationParams;


