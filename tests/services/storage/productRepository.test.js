import { afterEach, beforeEach, describe, expect, it } from "vitest";
import productDetailFixture from "../../fixtures/product-detail.json";
import productsFixture from "../../fixtures/products.json";
import {
  createProductRepository,
} from "@/services/storage/productRepository.js";
import {
  createTestDatabase,
  disposeTestDatabase,
} from "../../helpers/createTestDatabase.js";

describe("productRepository", () => {
  let database;
  let repository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = createProductRepository(database);
  });

  afterEach(async () => {
    await disposeTestDatabase(database);
  });

  it("stores products with normalized searchable fields and original order", async () => {
    await repository.replaceProducts(productsFixture);

    const storedProducts = await repository.getProductsLocal();

    expect(storedProducts).toHaveLength(productsFixture.length);
    expect(storedProducts[0]).toMatchObject({
      ...productsFixture[0],
      brandSearch: "acer",
      modelSearch: "iconia talk s",
      sortOrder: 0,
    });
    expect(storedProducts[1].sortOrder).toBe(1);
  });

  it("searches partial brand and model matches without case or accent differences", async () => {
    const products = [
      { ...productsFixture[0], brand: "Ácer", model: "Líquido Neo" },
      productsFixture[1],
    ];
    await repository.replaceProducts(products);

    await expect(repository.searchProductsLocal("ACER")).resolves.toMatchObject([
      { id: products[0].id, brand: "Ácer" },
      { id: products[1].id, brand: "Acer" },
    ]);
    await expect(repository.searchProductsLocal("liquido")).resolves.toMatchObject(
      [{ id: products[0].id, model: "Líquido Neo" }],
    );
  });

  it("returns all local products for an empty search term", async () => {
    await repository.replaceProducts(productsFixture);

    await expect(repository.searchProductsLocal("  ")).resolves.toHaveLength(
      productsFixture.length,
    );
  });

  it("stores and reads product details by ID", async () => {
    await repository.saveProductDetail(productDetailFixture);

    await expect(
      repository.getProductDetailLocal(productDetailFixture.id),
    ).resolves.toEqual(productDetailFixture);
  });
});
