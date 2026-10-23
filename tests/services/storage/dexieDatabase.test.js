import { randomUUID } from "node:crypto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { createAppDatabase, db } from "@/services/storage/dexieDatabase.js";

describe("Dexie database", () => {
  it("defines the versioned application tables", () => {
    expect(db.name).toBe("itx-frontend-test");
    expect(db.verno).toBe(2);
    expect(db.tables.map(({ name }) => name)).toEqual(["apiCache"]);
  });

  it("indexes cache expiration and uses endpoint keys", () => {
    expect(db.apiCache.schema.primKey.keyPath).toBe("key");
    expect(db.apiCache.schema.indexes.map(({ name }) => name)).toContain(
      "expiresAt",
    );
  });

  it("upgrades an existing database while keeping the cached response", async () => {
    const name = `itx-upgrade-${randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      apiCache: "&key, expiresAt",
      products: "&id",
      productDetails: "&id",
      appState: "&key",
    });
    await legacy.open();
    await legacy.apiCache.put({ key: "/product", response: [{ id: "1" }], expiresAt: 123 });
    await legacy.appState.put({ key: "cartCount", value: 4 });
    legacy.close();

    const upgraded = createAppDatabase(name);
    try {
      await upgraded.open();
      expect(upgraded.tables.map(({ name: tableName }) => tableName)).toEqual(["apiCache"]);
      expect((await upgraded.apiCache.get("/product")).response).toEqual([{ id: "1" }]);
    } finally {
      upgraded.close();
      await upgraded.delete();
    }
  });
});
