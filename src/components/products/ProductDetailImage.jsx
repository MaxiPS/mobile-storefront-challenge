import { useState } from "react";
import { Smartphone } from "lucide-react";

export default function ProductDetailImage({ product }) {
  const [hasError, setHasError] = useState(false);
  const productName = [product.brand, product.model].filter(Boolean).join(" ");

  if (!product.imgUrl || hasError) {
    return (
      <div
        className="product-detail-media__placeholder"
        role="img"
        aria-label={productName}
      >
        <Smartphone size={72} strokeWidth={1.1} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      className="product-detail-media__image"
      src={product.imgUrl}
      alt={productName}
      onError={() => setHasError(true)}
    />
  );
}
