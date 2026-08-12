import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAdminTheme } from '../context/AdminThemeContext';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push('...');

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }

    return pages;
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const btnBase = `h-9 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`;
  const btnStyle = isDark
    ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs';
  const activeBtnStyle = 'bg-primary text-white border-primary shadow-md shadow-primary/20 font-black';

  return (
    <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
      isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
    }`}>
      {/* Left side: Item count info & page size selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-xs font-semibold ${textMuted}`}>
          Showing <strong className={textPrimary}>{startItem}–{endItem}</strong> of{' '}
          <strong className={textPrimary}>{totalItems.toLocaleString()}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${textMuted}`}>| Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={`h-8 px-2.5 rounded-xl border text-xs font-extrabold focus:outline-none ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page navigation buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`${btnBase} ${btnStyle}`}
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${btnBase} ${btnStyle}`}
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page number buttons */}
        <div className="hidden xs:flex items-center gap-1">
          {getPageNumbers().map((num, i) => {
            if (num === '...') {
              return (
                <span key={`ellipsis-${i}`} className={`px-2 text-xs font-bold ${textMuted}`}>
                  ...
                </span>
              );
            }
            const pageNum = Number(num);
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`${btnBase} ${isActive ? activeBtnStyle : btnStyle}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Page X of Y on small screens */}
        <span className={`xs:hidden text-xs font-extrabold px-2 ${textPrimary}`}>
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`${btnBase} ${btnStyle}`}
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className={`${btnBase} ${btnStyle}`}
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
