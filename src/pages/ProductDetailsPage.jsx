import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Smartphone } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader.jsx";
import ProductActions from "@/components/products/ProductActions.jsx";
import { Button } from "@/components/ui/button.jsx";
import { productsCache } from "@/services/storage/cache.js";

function formatPrice(price) {
  const normalizedPrice = String(price ?? "").trim();
  return normalizedPrice ? `${normalizedPrice} \u20ac` : "Price unavailable";
}

function formatSpecification(value) {
  if (Array.isArray(value)) {
    return value.map((part) => String(part ?? "").trim()).filter(Boolean).join(", ");
  }

  return String(value ?? "").trim();
}

function getSpecifications(product) {
  const specifications = [
    { label: "CPU", value: product.cpu },
    { label: "RAM", value: product.ram },
    { label: "Operating system", value: product.os },
    { label: "Screen size", value: product.displayResolution },
    { label: "Resolution", value: product.displaySize },
    { label: "Battery", value: product.battery },
    { label: "Main camera", value: product.primaryCamera },
    { label: "Front camera", value: product.secondaryCmera },
    { label: "Dimensions", value: product.dimentions },
    {
      label: "Weight",
      value: product.weight ? `${product.weight} g` : product.weight,
    },
  ];

  return specifications
    .map(({ label, value }) => ({ label, value: formatSpecification(value) }))
    .filter(({ value }) => value.length > 0);
}

function LoadingState() {
  return (
    <div className="product-detail-state" role="status" aria-live="polite">
      <span className="product-state__spinner" aria-hidden="true" />
      <p>Loading product...</p>
    </div>
  );
}

function ProductErrorState({ isNotFound, onRetry }) {
  if (isNotFound) {
    return (
      <section className="product-detail-state" aria-labelledby="detail-error-title">
        <h1 id="detail-error-title">Product not found</h1>
        <p>This product may have been removed or the link may be incorrect.</p>
        <Link className="detail-back-link" to="/">
          <ArrowLeft size={17} aria-hidden="true" />
          Back to products
        </Link>
      </section>
    );
  }

  return (
    <section
      className="product-detail-state product-detail-state--error"
      role="alert"
    >
      <h1>We couldn&apos;t load this product</h1>
      <p>Check your connection and try again.</p>
      <Button onClick={onRetry}>Try again</Button>
      <Link className="detail-back-link" to="/">
        <ArrowLeft size={17} aria-hidden="true" />
        Back to products
      </Link>
    </section>
  );
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [resource, setResource] = useState({
    id: null,
    product: null,
    status: "loading",
    isStale: false,
  });

  useEffect(() => {
    let isActive = true;

    productsCache
      .getProductDetail(id)
      .then(({ product, isStale }) => {
        if (isActive) {
          setResource({ id, product, status: "ready", isStale });
        }
      })
      .catch((error) => {
        if (isActive) {
          setResource({
            id,
            product: null,
            status: error?.status === 404 ? "not-found" : "error",
            isStale: false,
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [id, loadAttempt]);

  function handleRetry() {
    setResource({ id, product: null, status: "loading", isStale: false });
    setLoadAttempt((attempt) => attempt + 1);
  }

  const currentResource =
    resource.id === id
      ? resource
      : { id, product: null, status: "loading", isStale: false };
  const product = currentResource.product;
  const specifications = product ? getSpecifications(product) : [];
  const breadcrumbItems = [
    { label: "Products", to: "/" },
    {
      label:
        product?.model ??
        (currentResource.status === "not-found"
          ? "Product not found"
          : "Product details"),
    },
  ];

  return (
    <div className="storefront">
      <AppHeader breadcrumbs={breadcrumbItems} />

      <main className="product-detail-page">
        {currentResource.status === "loading" && <LoadingState />}

        {(currentResource.status === "error" ||
          currentResource.status === "not-found") && (
          <ProductErrorState
            isNotFound={currentResource.status === "not-found"}
            onRetry={handleRetry}
          />
        )}

        {currentResource.status === "ready" && product && (
          <>
            <Link className="detail-back-link product-detail-page__back" to="/">
              <ArrowLeft size={17} aria-hidden="true" />
              Back to products
            </Link>

            {currentResource.isStale && (
              <p className="stale-notice" role="status">
                Showing saved product details. The latest update is unavailable.
              </p>
            )}

            <section
              className="product-detail-layout"
              aria-labelledby="product-detail-title"
            >
              <div className="product-detail-media">
                {product.imgUrl ? (
                  <img
                    className="product-detail-media__image"
                    src={product.imgUrl}
                    alt={`${product.brand} ${product.model}`}
                  />
                ) : (
                  <div
                    className="product-detail-media__placeholder"
                    aria-hidden="true"
                  >
                    <Smartphone size={72} strokeWidth={1.1} />
                  </div>
                )}
              </div>

              <div className="product-detail-info">
                <p className="product-detail-info__brand">{product.brand}</p>
                <h1 className="product-detail-info__title" id="product-detail-title">
                  {product.model}
                </h1>
                <p className="product-detail-info__price">
                  {formatPrice(product.price)}
                </p>

                {specifications.length > 0 && (
                  <section
                    className="product-specifications"
                    aria-labelledby="specifications-title"
                  >
                    <h2 id="specifications-title">Specifications</h2>
                    <dl className="product-specifications__list">
                      {specifications.map(({ label, value }) => (
                        <div className="product-specifications__row" key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}

                <ProductActions key={product.id} product={product} />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
