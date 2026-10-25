import { db } from "@/services/storage/dexieDatabase.js";

function isValidSelection(selection) {
  return (
    typeof selection?.id === "string" &&
    selection.id.trim().length > 0 &&
    Number.isInteger(selection.colorCode) &&
    selection.colorCode >= 0 &&
    Number.isInteger(selection.storageCode) &&
    selection.storageCode >= 0
  );
}

function getCartCount(items) {
  const apiCount = items.reduce(
    (count, item) => Math.max(count, item.apiCount ?? 0),
    0,
  );
  return Math.max(items.length, apiCount);
}

export function createCartRepository({ database = db, now = () => Date.now() } = {}) {
  async function getItems() {
    return database.cartItems.orderBy("addedAt").toArray();
  }

  async function getCount() {
    return getCartCount(await database.cartItems.toArray());
  }

  async function addItem(selection, apiCount) {
    if (!isValidSelection(selection)) {
      throw new TypeError("Cart item must include a product and valid variant codes");
    }
    if (!Number.isInteger(apiCount) || apiCount < 0) {
      throw new TypeError("Cart API count must be a non-negative integer");
    }

    return database.transaction("rw", database.cartItems, async () => {
      await database.cartItems.add({
        productId: selection.id,
        colorCode: selection.colorCode,
        storageCode: selection.storageCode,
        apiCount,
        addedAt: now(),
      });
      return getCartCount(await database.cartItems.toArray());
    });
  }

  return { getItems, getCount, addItem };
}

export const cartRepository = createCartRepository();
