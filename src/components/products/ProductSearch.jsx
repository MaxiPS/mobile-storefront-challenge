import { Search } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";

export default function ProductSearch({ value, onChange }) {
  return (
    <div className="product-search">
      <label
        className="product-search__label product-search__label--visually-hidden"
        htmlFor="product-search-input"
      >
        Search products
      </label>
      <div className="product-search__control">
        <Search
          className="product-search__icon"
          size={19}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <Input
          className="product-search__input"
          id="product-search-input"
          type="search"
          name="product-search"
          placeholder="Search products..."
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
