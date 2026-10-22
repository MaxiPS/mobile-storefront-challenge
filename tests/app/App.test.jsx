import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/app/App.jsx";
import { getProducts } from "@/services/api/productsApi.js";
import { appStore } from "@/store/appStore.js";
import productsFixture from "../fixtures/products.json";

vi.mock("@/services/api/productsApi.js", () => ({
  addProductToCart: vi.fn(),
  getProductById: vi.fn(),
  getProducts: vi.fn(),
}));

beforeEach(() => {
  getProducts.mockResolvedValue(productsFixture);
});

describe("App", () => {
  it("renders the root route and initializes the shared application state", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
    await waitFor(() => {
      expect(appStore.getSnapshot()).toMatchObject({
        cartCount: 0,
        isHydrated: true,
      });
    });
  });
});
