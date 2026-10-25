import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import App from "@/app/App.jsx";
import productsFixture from "../fixtures/products.json";

const server = setupServer(
  http.get("https://itx-frontend-test.onrender.com/api/product", () =>
    HttpResponse.json(productsFixture),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe("App", () => {
  it("renders the catalog at the root route", async () => {
    render(<App />);

    expect(await screen.findByText(productsFixture[0].model)).toBeInTheDocument();
  });
});
