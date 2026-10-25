import { useEffect } from "react";
import AppHeader from "@/components/layout/AppHeader.jsx";
import ProductResults from "@/components/products/ProductResults.jsx";
import ProductSearch from "@/components/products/ProductSearch.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useProductListStore } from "@/hooks/useProductListStore.js";
import { productListStore } from "@/store/productListStore.js";

export default function ProductListPage() {
  const { products, visibleProducts, searchTerm, status, isStale, isSearchPending } =
    useProductListStore();

  useEffect(() => {
    void productListStore.load();
  }, []);

  return (
    <div className="storefront">
      <AppHeader breadcrumbs={[{ label: "Products" }]} />

      <main className="product-page" id="main-content" tabIndex={-1}>
        <section className="product-page__intro" aria-labelledby="product-page-title">
          <div className="product-page__heading">
            <h1 className="product-page__title" id="product-page-title">
              Products
            </h1>
          </div>
          <ProductSearch value={searchTerm} onChange={productListStore.setSearchTerm} />
        </section>

        {status === "loading" && (
          <div className="product-state" role="status" aria-live="polite">
            <span className="product-state__spinner" aria-hidden="true" />
            <p>Loading products...</p>
          </div>
        )}

        {status === "error" && (
          <section className="product-state product-state--error" role="alert">
            <h2>We couldn&apos;t load products</h2>
            <p>Check your connection and try again.</p>
            <Button onClick={productListStore.load}>Try again</Button>
          </section>
        )}

        {status === "ready" && (
          <ProductResults
            products={products}
            visibleProducts={visibleProducts}
            isSearchPending={isSearchPending}
            isStale={isStale}
          />
        )}
      </main>
    </div>
  );
}
