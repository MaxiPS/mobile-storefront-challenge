import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card.jsx";

function getPriceLabel(price) {
  const normalizedPrice = String(price ?? "").trim();
  return normalizedPrice ? `${normalizedPrice} €` : "Price unavailable";
}

export default function ProductCard({ product }) {
  const productName = [product.brand, product.model].filter(Boolean).join(" ");

  return (
    <li className="product-grid__item">
      <Link
        className="product-card-link"
        to={`/products/${encodeURIComponent(product.id)}`}
        aria-label={`View ${productName} details`}
      >
        <Card className="product-card">
          <div className="product-card__media">
            {product.imgUrl ? (
              <img
                className="product-card__image"
                src={product.imgUrl}
                alt={productName}
                loading="lazy"
              />
            ) : (
              <span className="product-card__placeholder" aria-hidden="true">
                <Smartphone size={42} strokeWidth={1.2} />
              </span>
            )}
          </div>
          <CardContent className="product-card__content">
            <span className="product-card__brand">{product.brand}</span>
            <h2 className="product-card__model">{product.model}</h2>
            <p className="product-card__price">{getPriceLabel(product.price)}</p>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
