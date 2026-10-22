import { randomUUID } from "node:crypto";
import { createAppDatabase } from "@/services/storage/dexieDatabase.js";

export async function createTestDatabase() {
  const database = createAppDatabase(`itx-test-${randomUUID()}`);
  await database.open();
  return database;
}

export async function disposeTestDatabase(database) {
  database.close();
  await database.delete();
}
