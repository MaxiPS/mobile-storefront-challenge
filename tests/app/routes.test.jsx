import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import AppRoutes from "@/app/routes.jsx";
import { db } from "@/services/storage/dexieDatabase.js";
import productDetailFixture from "../fixtures/product-detail.json";
import productsFixture from "../fixtures/products.json";

const API_BASE_URL = "https://itx-frontend-test.onrender.com/api";
const server = setupServer(
  http.get(`${API_BASE_URL}/product`, () => HttpResponse.json(productsFixture)),
  http.get(`${API_BASE_URL}/product/${productDetailFixture.id}`, () =>
    HttpResponse.json(productDetailFixture),
  ),
);

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(async () => db.apiCache.clear());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

function renderRoutes(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("application routes", () => {
  it("renders the product list at the root route", async () => {
    renderRoutes(["/"]);

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
  });

  it("renders product details for the requested product ID", async () => {
    renderRoutes([`/products/${productDetailFixture.id}`]);

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
  });

  it("renders a not-found page for unknown routes", () => {
    renderRoutes(["/unknown"]);

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to products" })).toHaveAttribute("href", "/");
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
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
  });
});
