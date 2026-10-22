import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader.jsx";
import ProductResults from "@/components/products/ProductResults.jsx";
import ProductSearch from "@/components/products/ProductSearch.jsx";
import { Button } from "@/components/ui/button.jsx";
import { productsCache } from "@/services/storage/cache.js";
import { productRepository } from "@/services/storage/productRepository.js";

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [searchResult, setSearchResult] = useState({
    term: "",
    products: [],
    sourceProducts: null,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let isActive = true;

    productsCache
      .getProducts()
      .then(({ products: loadedProducts, isStale: loadedIsStale }) => {
        if (!isActive) {
          return;
        }

        setProducts(loadedProducts);
        setIsStale(loadedIsStale);
        setStatus("ready");
      })
      .catch(() => {
        if (isActive) {
          setStatus("error");
        }
      });

    return () => {
      isActive = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (status !== "ready" || !searchTerm.trim()) {
      return undefined;
    }

    let isActive = true;

    productRepository
      .searchProductsLocal(searchTerm)
      .then((matchingProducts) => {
        if (isActive) {
          setSearchResult({
            term: searchTerm,
            products: matchingProducts,
            sourceProducts: products,
          });
        }
      })
      .catch(() => {
        if (isActive) {
          setStatus("error");
        }
      });

    return () => {
      isActive = false;
    };
  }, [products, searchTerm, status]);

  function handleRetry() {
    setStatus("loading");
    setLoadAttempt((attempt) => attempt + 1);
  }

  const hasSearchTerm = Boolean(searchTerm.trim());
  const hasCurrentSearchResults =
    searchResult.term === searchTerm && searchResult.sourceProducts === products;
  const isSearchPending =
    status === "ready" && hasSearchTerm && !hasCurrentSearchResults;
  const visibleProducts = hasSearchTerm
    ? hasCurrentSearchResults
      ? searchResult.products
      : []
    : products;

  return (
    <div className="storefront">
      <AppHeader breadcrumbs={[{ label: "Products" }]} />

      <main className="product-page">
        <section className="product-page__intro" aria-labelledby="product-page-title">
          <div className="product-page__heading">
            <p className="eyebrow">Mobile collection</p>
            <h1 className="product-page__title" id="product-page-title">
              Products
            </h1>
            <p className="product-page__description">
              Find the right device for your everyday life.
            </p>
          </div>
          <ProductSearch value={searchTerm} onChange={setSearchTerm} />
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
            <Button onClick={handleRetry}>Try again</Button>
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
