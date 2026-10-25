import { afterEach, beforeEach, describe, expect, it } from "vitest";
import productsFixture from "../../fixtures/products.json";
import searchProductsFixture from "../../fixtures/search-products.json";
import { createProductRepository } from "@/services/storage/productRepository.js";
import { createTestDatabase, disposeTestDatabase } from "../../helpers/createTestDatabase.js";

const firstProduct = productsFixture[0];
const modelSearchTarget = productsFixture.find((product) => product.model);

function transposeFirstTwoCharacters(value) {
  const [first, second, ...remaining] = value.toLowerCase();
  return `${second}${first}${remaining.join("")}`;
}

function productsWithBrand(products, brand) {
  return products.filter(
    (product) => product.brand.toLowerCase() === brand.toLowerCase(),
  );
}

async function cacheProducts(database, products) {
  await database.apiCache.put({ key: "/product", response: products, expiresAt: 1 });
}

describe("local catalog search", () => {
  let database;
  beforeEach(async () => {
    database = await createTestDatabase();
    await database.apiCache.put({ key: "/product", response: productsFixture, expiresAt: 1 });
  });
  afterEach(async () => disposeTestDatabase(database));

  it("finds cached products by model", async () => {
    const repository = createProductRepository(database);
    const expectedProducts = productsFixture.filter(
      (product) => product.model.toLowerCase() === modelSearchTarget.model.toLowerCase(),
    );

    await expect(repository.searchProductsLocal(modelSearchTarget.model)).resolves.toEqual(
      expectedProducts,
    );
  });

  it("matches brands without case differences", async () => {
    await cacheProducts(database, searchProductsFixture);
    const repository = createProductRepository(database);
    const brand = searchProductsFixture[0].brand;

    await expect(repository.searchProductsLocal(brand.toUpperCase())).resolves.toEqual(
      productsWithBrand(searchProductsFixture, brand),
    );
  });

  it("matches a misspelled brand", async () => {
    await cacheProducts(database, searchProductsFixture);
    const repository = createProductRepository(database);
    const brand = searchProductsFixture[0].brand;

    await expect(
      repository.searchProductsLocal(transposeFirstTwoCharacters(brand)),
    ).resolves.toEqual(productsWithBrand(searchProductsFixture, brand));
  });

  it("matches a model when adjacent letters are transposed", async () => {
    const repository = createProductRepository(database);

    await expect(
      repository.searchProductsLocal(
        transposeFirstTwoCharacters(modelSearchTarget.model),
      ),
    ).resolves.toContainEqual(modelSearchTarget);
  });

  it("does not fuzzy match fields other than brand and model", async () => {
    await database.apiCache.put({
      key: "/product",
      response: [
        {
          ...firstProduct,
          brand: "Nokia",
          model: "X10",
          price: transposeFirstTwoCharacters(modelSearchTarget.model),
        },
      ],
      expiresAt: 1,
    });
    const repository = createProductRepository(database);

    await expect(
      repository.searchProductsLocal(
        transposeFirstTwoCharacters(modelSearchTarget.model),
      ),
    ).resolves.toEqual([]);
  });

  it("returns all cached products for an empty term", async () => {
    const repository = createProductRepository(database);
    await expect(repository.searchProductsLocal("")).resolves.toEqual(productsFixture);
  });
});
