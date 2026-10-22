import ProductGrid from "@/components/products/ProductGrid.jsx";

export default function ProductResults({
  products,
  visibleProducts,
  isSearchPending,
  isStale,
}) {
  return (
    <section className="product-results" aria-label="Product results">
      {isStale && (
        <p className="stale-notice" role="status">
          Showing saved products. The latest update is unavailable.
        </p>
      )}
      <ProductResultsContent
        products={products}
        visibleProducts={visibleProducts}
        isSearchPending={isSearchPending}
      />
    </section>
  );
}

function ProductResultsContent({ products, visibleProducts, isSearchPending }) {
  if (products.length === 0) {
    return (
      <div className="product-state">
        <h2>No products available</h2>
        <p>There are no products to show right now.</p>
      </div>
    );
  }

  if (isSearchPending) {
    return (
      <div className="product-state" role="status" aria-live="polite">
        <p>Searching local products...</p>
      </div>
    );
  }

  if (visibleProducts.length === 0) {
    return (
      <div className="product-state">
        <h2>No products found</h2>
        <p>Try another brand or model name.</p>
      </div>
    );
  }

  return (
    <>
      <p className="product-results__count" aria-live="polite">
        {visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}
      </p>
      <ProductGrid products={visibleProducts} />
    </>
  );
}
