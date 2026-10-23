import { useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import ProductCard from "@/components/products/ProductCard.jsx";

const ESTIMATED_ROW_HEIGHT = 420;

function getColumnCount(viewportWidth) {
  if (viewportWidth <= 420) return 1;
  if (viewportWidth <= 760) return 2;
  if (viewportWidth <= 900) return 3;
  return 4;
}

export default function ProductGrid({ products }) {
  const [columnCount, setColumnCount] = useState(() => getColumnCount(window.innerWidth));
  const [scrollMargin, setScrollMargin] = useState(0);
  const gridRef = useRef(null);
  const rowCount = Math.ceil(products.length / columnCount);

  useLayoutEffect(() => {
    function updateGridLayout() {
      const nextColumnCount = getColumnCount(window.innerWidth);
      setColumnCount((currentColumnCount) =>
        currentColumnCount === nextColumnCount ? currentColumnCount : nextColumnCount,
      );
      setScrollMargin(gridRef.current?.offsetTop ?? 0);
    }

    updateGridLayout();
    window.addEventListener("resize", updateGridLayout);
    return () => window.removeEventListener("resize", updateGridLayout);
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (rowIndex) => products[rowIndex * columnCount]?.id ?? rowIndex,
    initialRect: { width: window.innerWidth, height: window.innerHeight },
    overscan: 1,
    scrollMargin,
    useFlushSync: false,
  });

  return (
    <ul
      ref={gridRef}
      className="product-grid"
      aria-label="Products"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const rowProducts = products.slice(
          virtualRow.index * columnCount,
          (virtualRow.index + 1) * columnCount,
        );

        return (
          <li
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className="product-grid__row"
            style={{
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
            }}
          >
            <ul
              className="product-grid__row-items"
              aria-label={`Product row ${virtualRow.index + 1}`}
            >
              {rowProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
