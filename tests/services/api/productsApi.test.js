import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import productDetailFixture from "../../fixtures/product-detail.json";
import productsFixture from "../../fixtures/products.json";
import {
  addProductToCart,
  getProductById,
  getProducts,
} from "@/services/api/productsApi.js";

const API_BASE_URL = "https://itx-frontend-test.onrender.com/api";
const server = setupServer();
let requests = [];

beforeAll(() => {
  server.events.on("request:start", ({ request }) => {
    requests.push({ method: request.method, url: request.url });
  });
  server.listen({ onUnhandledFrame: "error" });
});
afterEach(() => {
  requests = [];
  server.resetHandlers();
});
afterAll(() => server.close());

describe("productsApi", () => {
  it("loads the product list from the expected endpoint", async () => {
    server.use(http.get(`${API_BASE_URL}/product`, () =>
      HttpResponse.json(productsFixture),
    ));

    await expect(getProducts()).resolves.toEqual(productsFixture);
    expect(requests).toEqual([
      { method: "GET", url: `${API_BASE_URL}/product` },
    ]);
  });

  it("loads a product detail by its encoded identifier", async () => {
    server.use(http.get(`${API_BASE_URL}/product/${productDetailFixture.id}`, () =>
      HttpResponse.json(productDetailFixture),
    ));

    await expect(getProductById(productDetailFixture.id)).resolves.toEqual(
      productDetailFixture,
    );
    expect(requests).toEqual([
      { method: "GET", url: `${API_BASE_URL}/product/${productDetailFixture.id}` },
    ]);
  });

  it("posts the selected product variants to the cart endpoint", async () => {
    const selection = {
      id: productDetailFixture.id,
      colorCode: 1000,
      storageCode: 2001,
    };
    let received;
    server.use(http.post(`${API_BASE_URL}/cart`, async ({ request }) => {
      received = {
        contentType: request.headers.get("content-type"),
        body: await request.json(),
      };
      return HttpResponse.json({ count: 3 });
    }));

    await expect(addProductToCart(selection)).resolves.toEqual({ count: 3 });
    expect(requests).toEqual([
      { method: "POST", url: `${API_BASE_URL}/cart` },
    ]);
    expect(received).toEqual({
      contentType: "application/json",
      body: selection,
    });
  });

  it("rejects HTTP errors with the response status", async () => {
    server.use(http.get(`${API_BASE_URL}/product`, () =>
      HttpResponse.json({}, { status: 503 }),
    ));

    await expect(getProducts()).rejects.toMatchObject({
      message: "API request failed with status 503",
      status: 503,
    });
  });

  it("exposes a not-found status for missing product details", async () => {
    server.use(http.get(`${API_BASE_URL}/product/missing-product`, () =>
      HttpResponse.json({}, { status: 404 }),
    ));

    await expect(getProductById("missing-product")).rejects.toMatchObject({
      message: "API request failed with status 404",
      status: 404,
    });
  });

  it("propagates network failures", async () => {
    server.use(http.get(`${API_BASE_URL}/product`, () => HttpResponse.error()));

    await expect(getProducts()).rejects.toBeInstanceOf(TypeError);
  });
});
