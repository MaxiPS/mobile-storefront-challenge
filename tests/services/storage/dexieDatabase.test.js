import { describe, expect, it } from "vitest";
import { db } from "@/services/storage/dexieDatabase.js";

describe("Dexie database", () => {
  it("defines the versioned application tables", () => {
    expect(db.name).toBe("itx-frontend-test");
    expect(db.verno).toBe(1);
    expect(db.tables.map(({ name }) => name).sort()).toEqual([
      "apiCache",
      "appState",
      "productDetails",
      "products",
    ]);
  });

  it("indexes cache expiration and uses IDs as product keys", () => {
    expect(db.apiCache.schema.primKey.keyPath).toBe("key");
    expect(db.apiCache.schema.indexes.map(({ name }) => name)).toContain(
      "expiresAt",
    );
    expect(db.products.schema.primKey.keyPath).toBe("id");
    expect(db.productDetails.schema.primKey.keyPath).toBe("id");
    expect(db.appState.schema.primKey.keyPath).toBe("key");
  });
});
