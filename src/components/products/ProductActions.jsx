import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { addProductToCart } from "@/services/api/productsApi.js";
import { cartStore } from "@/store/cartStore.js";

const COLOR_SWATCHES = {
  black: "#17191d",
  blue: "#6e9bc9",
  gold: "#d9bc70",
  gray: "#9399a1",
  green: "#9caf9a",
  grey: "#9399a1",
  orange: "#dc9664",
  pink: "#e7b7bf",
  red: "#c96e6e",
  silver: "#d2d5d9",
  white: "#ffffff",
  yellow: "#eee39b",
};

function getOptions(options) {
  return Array.isArray(options) ? options : [];
}

function getOptionValue(option) {
  return option?.code === undefined || option?.code === null
    ? ""
    : String(option.code);
}

function getColorSwatch(name) {
  const normalizedName = String(name ?? "").trim().toLowerCase();
  return COLOR_SWATCHES[normalizedName] ?? "#d8dde4";
}

function ColorOptions({ colors, selectedCode, productId, disabled, onChange }) {
  return (
    <fieldset className="product-actions__field" disabled={disabled}>
      <legend className="product-actions__label">Color</legend>
      {colors.length > 0 ? (
        <div className="product-actions__color-options">
          {colors.map((color) => {
            const value = getOptionValue(color);

            return (
              <label
                className={`product-actions__color-option${selectedCode === value ? " is-selected" : ""}`}
                key={value || color.name}
                title={color.name}
              >
                <input
                  aria-label={color.name}
                  checked={selectedCode === value}
                  className="product-actions__visually-hidden"
                  disabled={!value}
                  name={`product-color-${productId}`}
                  onChange={() => onChange(value)}
                  type="radio"
                  value={value}
                />
                <span
                  aria-hidden="true"
                  className="product-actions__color-swatch"
                  style={{ "--product-swatch-color": getColorSwatch(color.name) }}
                />
              </label>
            );
          })}
        </div>
      ) : (
        <span className="product-actions__hint">No colors available</span>
      )}
    </fieldset>
  );
}

function StorageOptions({ storages, selectedCode, productId, disabled, onChange }) {
  return (
    <fieldset className="product-actions__field" disabled={disabled}>
      <legend className="product-actions__label">Storage</legend>
      {storages.length > 0 ? (
        <div className="product-actions__storage-options">
          {storages.map((storage) => {
            const value = getOptionValue(storage);

            return (
              <label
                className={`product-actions__storage-option${selectedCode === value ? " is-selected" : ""}`}
                key={value || storage.name}
              >
                <input
                  aria-label={storage.name}
                  checked={selectedCode === value}
                  className="product-actions__visually-hidden"
                  disabled={!value}
                  name={`product-storage-${productId}`}
                  onChange={() => onChange(value)}
                  type="radio"
                  value={value}
                />
                <span>{storage.name}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <span className="product-actions__hint">No storage options available</span>
      )}
    </fieldset>
  );
}

export default function ProductActions({ product }) {
  const colors = getOptions(product.options?.colors);
  const storages = getOptions(product.options?.storages);
  const [colorCode, setColorCode] = useState(() => getOptionValue(colors[0]));
  const [storageCode, setStorageCode] = useState(() =>
    getOptionValue(storages[0]),
  );
  const [requestStatus, setRequestStatus] = useState("idle");

  const isPending = requestStatus === "pending";
  const canAddToCart =
    colors.length > 0 &&
    storages.length > 0 &&
    colorCode !== "" &&
    storageCode !== "";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canAddToCart || isPending) {
      return;
    }

    setRequestStatus("pending");

    try {
      const result = await addProductToCart({
        id: product.id,
        colorCode: Number(colorCode),
        storageCode: Number(storageCode),
      });

      if (!Number.isInteger(result?.count) || result.count < 0) {
        throw new TypeError("Cart API response must include a valid count");
      }

      cartStore.setCartCount(result.count);
      setRequestStatus("success");
    } catch {
      setRequestStatus("error");
    }
  }

  return (
    <form className="product-actions" onSubmit={handleSubmit}>
      <div className="product-actions__selectors">
        <ColorOptions
          colors={colors}
          disabled={isPending}
          onChange={setColorCode}
          productId={product.id}
          selectedCode={colorCode}
        />
        <StorageOptions
          disabled={isPending}
          onChange={setStorageCode}
          productId={product.id}
          selectedCode={storageCode}
          storages={storages}
        />
      </div>

      <Button
        className="product-actions__submit"
        type="submit"
        disabled={!canAddToCart || isPending}
      >
        <ShoppingCart size={18} aria-hidden="true" />
        {isPending ? "Adding..." : "Add to cart"}
      </Button>

      {requestStatus === "success" && (
        <p className="product-actions__message" role="status">
          Added to cart
        </p>
      )}
      {requestStatus === "error" && (
        <p
          className="product-actions__message product-actions__message--error"
          role="alert"
          aria-label="Cart update failed"
        >
          We couldn&apos;t add this product. Please try again.
        </p>
      )}
    </form>
  );
}
