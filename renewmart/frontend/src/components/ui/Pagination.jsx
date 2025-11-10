import React from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const Pagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange, 
  itemsPerPage = 12,
  totalItems = 0,
  showInfo = true,
  arrowOnly = false
}) => {
  if (totalPages <= 1) return null;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total pages is 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (arrowOnly) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          iconName="ChevronLeft"
          className="w-10 h-10"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          iconName="ChevronRight"
          className="w-10 h-10"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border">
      {showInfo && totalItems > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          iconName="ChevronLeft"
          iconPosition="left"
        >
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }
            
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted border border-border'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          iconName="ChevronRight"
          iconPosition="right"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;

