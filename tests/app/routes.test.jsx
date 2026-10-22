import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AppRoutes from "@/app/routes.jsx";

afterEach(cleanup);

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

    await user.click(screen.getByRole("link", { name: "View sample product" }));

    expect(
      screen.getByRole("heading", { name: "Product details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Product ID: demo-product")).toBeInTheDocument();
  });
});
