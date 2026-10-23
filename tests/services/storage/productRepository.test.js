import { afterEach, beforeEach, describe, expect, it } from "vitest";
import productsFixture from "../../fixtures/products.json";
import { createProductRepository } from "@/services/storage/productRepository.js";
import { createTestDatabase, disposeTestDatabase } from "../../helpers/createTestDatabase.js";

describe("local catalog search", () => {
  let database;
  beforeEach(async () => {
    database = await createTestDatabase();
    await database.apiCache.put({ key: "/product", response: productsFixture, expiresAt: 1 });
  });
  afterEach(async () => disposeTestDatabase(database));

  it("finds cached products by model", async () => {
    const repository = createProductRepository(database);
    await expect(repository.searchProductsLocal("jade")).resolves.toEqual([productsFixture[1]]);
  });

  it("matches brands without case differences", async () => {
    const repository = createProductRepository(database);
    await expect(repository.searchProductsLocal("ACER")).resolves.toEqual(productsFixture);
  });

  it("matches a misspelled brand", async () => {
    const repository = createProductRepository(database);
    await expect(repository.searchProductsLocal("acr")).resolves.toEqual(productsFixture);
  });

  it("matches a model when adjacent letters are transposed", async () => {
    const repository = createProductRepository(database);
    await expect(repository.searchProductsLocal("jdae")).resolves.toEqual([productsFixture[1]]);
  });

  it("does not fuzzy match fields other than brand and model", async () => {
    await database.apiCache.put({
      key: "/product",
      response: [{ ...productsFixture[0], brand: "Nokia", model: "X10", price: "jdae" }],
      expiresAt: 1,
    });
    const repository = createProductRepository(database);

    await expect(repository.searchProductsLocal("jdae")).resolves.toEqual([]);
  });

  it("returns all cached products for an empty term", async () => {
    const repository = createProductRepository(database);
    await expect(repository.searchProductsLocal("")).resolves.toEqual(productsFixture);
  });
});
