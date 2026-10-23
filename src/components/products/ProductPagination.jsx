import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";

export default function ProductPagination({ pageIndex, pageCount, onPageChange }) {
  return (
    <nav className="product-pagination" aria-label="Product pagination">
      <Button
        className="product-pagination__arrow"
        variant="outline"
        onClick={() => onPageChange(pageIndex - 1)}
        disabled={pageIndex === 0}
        aria-label="Previous page"
        type="button"
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <p className="product-pagination__status" aria-live="polite">
        Page {pageIndex + 1} of {pageCount}
      </p>
      <div className="product-pagination__pages">
        {Array.from({ length: pageCount }, (_, index) => {
          const isCurrentPage = pageIndex === index;
          const pageNumber = index + 1;

          return (
            <Button
              aria-current={isCurrentPage ? "page" : undefined}
              aria-label={`Page ${pageNumber}`}
              className={`product-pagination__page${isCurrentPage ? " is-current" : ""}`}
              key={pageNumber}
              onClick={() => onPageChange(index)}
              type="button"
              variant="outline"
            >
              {pageNumber}
            </Button>
          );
        })}
      </div>
      <Button
        className="product-pagination__arrow"
        variant="outline"
        onClick={() => onPageChange(pageIndex + 1)}
        disabled={pageIndex === pageCount - 1}
        aria-label="Next page"
        type="button"
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
