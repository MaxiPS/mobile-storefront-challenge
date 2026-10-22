import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppRoutes from "@/app/routes.jsx";
import { getProducts } from "@/services/api/productsApi.js";
import productsFixture from "../fixtures/products.json";

vi.mock("@/services/api/productsApi.js", () => ({
  addProductToCart: vi.fn(),
  getProductById: vi.fn(),
  getProducts: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  getProducts.mockResolvedValue(productsFixture);
});

function renderRoutes(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("application routes", () => {
  it("renders the product list at the root route", () => {
    renderRoutes(["/"]);

    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
  });

  it("renders product details for the requested product ID", () => {
    renderRoutes(["/products/demo-product"]);

    expect(
      screen.getByRole("heading", { name: "Product details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Product ID: demo-product")).toBeInTheDocument();
  });

  it("renders a not-found page for unknown routes", () => {
    renderRoutes(["/unknown"]);

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to products" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("navigates from the product list to product details", async () => {
    const user = userEvent.setup();
    renderRoutes(["/"]);

    await user.click(
      await screen.findByRole("link", {
        name: "View Acer Iconia Talk S details",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Product details" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Product ID: ZmGrkLRPXOTpxsU4jjAcv"),
    ).toBeInTheDocument();
  });
});
