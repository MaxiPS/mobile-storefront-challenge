import Dexie from "dexie";

export const DATABASE_NAME = "itx-frontend-test";

const DATABASE_SCHEMA = {
  apiCache: "&key, expiresAt",
  products: "&id",
  productDetails: "&id",
  appState: "&key",
};

export function createAppDatabase(name = DATABASE_NAME) {
  const database = new Dexie(name);
  database.version(1).stores(DATABASE_SCHEMA);
  return database;
}

export const db = createAppDatabase();
