import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";

export default function ProductPagination({ pageIndex, pageCount, onPageChange }) {
  return (
    <nav className="product-pagination" aria-label="Product pagination">
      <Button
        className="product-pagination__button"
        variant="outline"
        onClick={() => onPageChange(pageIndex - 1)}
        disabled={pageIndex === 0}
        aria-label="Previous page"
      >
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <p className="product-pagination__status" aria-live="polite">
        Page {pageIndex + 1} of {pageCount}
      </p>
      <Button
        className="product-pagination__button"
        variant="outline"
        onClick={() => onPageChange(pageIndex + 1)}
        disabled={pageIndex === pageCount - 1}
        aria-label="Next page"
      >
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
