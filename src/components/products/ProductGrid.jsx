import ProductCard from "@/components/products/ProductCard.jsx";

export default function ProductGrid({ products }) {
  return (
    <ul className="product-grid" aria-label="Products">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}
