import { useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { addProductToCart } from "@/services/api/productsApi.js";
import { cartStore } from "@/store/cartStore.js";

function getOptions(options) {
  return Array.isArray(options) ? options : [];
}

function getOptionValue(option) {
  return option?.code === undefined || option?.code === null
    ? ""
    : String(option.code);
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
        <div className="product-actions__field">
          <span className="product-actions__label" id="product-color-label">
            Color
          </span>
          <Select
            value={colorCode}
            onValueChange={setColorCode}
            disabled={colors.length === 0 || isPending}
          >
            <SelectTrigger
              className="product-actions__select"
              aria-label="Color"
              aria-labelledby="product-color-label"
            >
              <SelectValue placeholder="Select a color" />
            </SelectTrigger>
            <SelectContent>
              {colors.map((color) => (
                <SelectItem
                  key={getOptionValue(color)}
                  value={getOptionValue(color)}
                >
                  {color.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {colors.length === 0 && (
            <span className="product-actions__hint">No colors available</span>
          )}
        </div>

        <div className="product-actions__field">
          <span className="product-actions__label" id="product-storage-label">
            Storage
          </span>
          <Select
            value={storageCode}
            onValueChange={setStorageCode}
            disabled={storages.length === 0 || isPending}
          >
            <SelectTrigger
              className="product-actions__select"
              aria-label="Storage"
              aria-labelledby="product-storage-label"
            >
              <SelectValue placeholder="Select storage" />
            </SelectTrigger>
            <SelectContent>
              {storages.map((storage) => (
                <SelectItem
                  key={getOptionValue(storage)}
                  value={getOptionValue(storage)}
                >
                  {storage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {storages.length === 0 && (
            <span className="product-actions__hint">No storage options available</span>
          )}
        </div>
      </div>

      <Button
        className="product-actions__submit"
        type="submit"
        disabled={!canAddToCart || isPending}
      >
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
