import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  disposeTestDatabase,
} from "../../helpers/createTestDatabase.js";
import { createCartRepository } from "@/services/storage/cartRepository.js";

let database;
let repository;

beforeEach(async () => {
  database = await createTestDatabase();
  repository = createCartRepository({ database, now: () => 1_000 });
});

afterEach(async () => {
  await disposeTestDatabase(database);
});

describe("cartRepository", () => {
  it("persists each selected product variant as a separate cart item", async () => {
    const firstSelection = { id: "phone-1", colorCode: 1000, storageCode: 2000 };
    const secondSelection = { id: "phone-1", colorCode: 1001, storageCode: 2001 };

    await repository.addItem(firstSelection, 1);
    await repository.addItem(secondSelection, 1);

    await expect(repository.getItems()).resolves.toEqual([
      {
        id: 1,
        productId: "phone-1",
        colorCode: 1000,
        storageCode: 2000,
        apiCount: 1,
        addedAt: 1_000,
      },
      {
        id: 2,
        productId: "phone-1",
        colorCode: 1001,
        storageCode: 2001,
        apiCount: 1,
        addedAt: 1_000,
      },
    ]);
    await expect(repository.getCount()).resolves.toBe(2);
  });

  it("keeps the API count when it is higher than the locally stored item count", async () => {
    await repository.addItem(
      { id: "phone-1", colorCode: 1000, storageCode: 2000 },
      5,
    );

    await expect(repository.getCount()).resolves.toBe(5);
  });

  it("counts concurrent additions without losing a cart item", async () => {
    const firstSelection = { id: "phone-1", colorCode: 1000, storageCode: 2000 };
    const secondSelection = { id: "phone-2", colorCode: 1001, storageCode: 2001 };

    await Promise.all([
      repository.addItem(firstSelection, 1),
      repository.addItem(secondSelection, 1),
    ]);

    expect(await repository.getItems()).toHaveLength(2);
    await expect(repository.getCount()).resolves.toBe(2);
  });

  it("rejects invalid product selections and API counts", async () => {
    await expect(repository.addItem({ id: "phone-1" }, 1)).rejects.toThrow(
      TypeError,
    );
    await expect(
      repository.addItem(
        { id: "phone-1", colorCode: 1000, storageCode: 2000 },
        -1,
      ),
    ).rejects.toThrow(TypeError);
  });
});
