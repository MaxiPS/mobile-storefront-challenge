import Dexie from "dexie";

export const DATABASE_NAME = "itx-frontend-test";

export function createAppDatabase(name = DATABASE_NAME) {
  const database = new Dexie(name);
  database.version(1).stores({
    apiCache: "&key, expiresAt",
    products: "&id",
    productDetails: "&id",
    appState: "&key",
  });
  database.version(2).stores({
    apiCache: "&key, expiresAt",
    products: null,
    productDetails: null,
    appState: null,
  });
  return database;
}

export const db = createAppDatabase();
