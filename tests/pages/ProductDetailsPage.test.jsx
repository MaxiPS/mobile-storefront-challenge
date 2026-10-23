import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import AppRoutes from "@/app/routes.jsx";
import { db } from "@/services/storage/dexieDatabase.js";
import { cartStore } from "@/store/cartStore.js";
import productDetailFixture from "../fixtures/product-detail.json";
import productsFixture from "../fixtures/products.json";

const API_BASE_URL = "https://itx-frontend-test.onrender.com/api";
const DETAIL_URL = `${API_BASE_URL}/product/${productDetailFixture.id}`;
const LIST_URL = `${API_BASE_URL}/product`;
const CART_URL = `${API_BASE_URL}/cart`;
const server = setupServer(
  http.get(LIST_URL, () => HttpResponse.json(productsFixture)),
  http.get(DETAIL_URL, () => HttpResponse.json(productDetailFixture)),
  http.post(CART_URL, async ({ request }) => {
    cartPayloads.push(await request.json());
    return HttpResponse.json({ count: 4 });
  }),
);
let requests = [];
let cartPayloads = [];

beforeAll(() => {
  server.events.on("request:start", ({ request }) => {
    requests.push({ method: request.method, url: request.url });
  });
  server.listen({ onUnhandledFrame: "error" });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

function expectDetailRequests(count) {
  expect(requests.filter(({ url }) => url === DETAIL_URL)).toEqual(
    Array.from({ length: count }, () => ({ method: "GET", url: DETAIL_URL })),
  );
}

async function clearDatabase() {
  await db.apiCache.clear();
}

function renderApplication({ strict = false } = {}) {
  const application = (
    <MemoryRouter initialEntries={[`/products/${productDetailFixture.id}`]}>
      <AppRoutes />
    </MemoryRouter>
  );

  return render(strict ? <StrictMode>{application}</StrictMode> : application);
}

beforeEach(async () => {
  requests = [];
  cartPayloads = [];
  await clearDatabase();
  cartStore.setCartCount(0);
});

describe("product details page", () => {
  it("loads the requested product from the API", async () => {
    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expectDetailRequests(1);
  });

  it("shows the product identity and price", async () => {
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    expect(screen.getByText("Acer")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Acer Iconia Talk S" }),
    ).toHaveAttribute("src", productDetailFixture.imgUrl);
    expect(screen.getByText("170 \u20ac")).toBeInTheDocument();
  });

  it("shows a product image placeholder when the image cannot be loaded", async () => {
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    fireEvent.error(screen.getByRole("img", { name: "Acer Iconia Talk S" }));

    expect(
      screen.getByRole("img", { name: "Acer Iconia Talk S" }),
    ).toHaveClass("product-detail-media__placeholder");
    expect(screen.queryByRole("img", { name: "Acer Iconia Talk S" })).not.toHaveAttribute(
      "src",
      productDetailFixture.imgUrl,
    );
  });

  it("shows the available product specifications", async () => {
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    expect(screen.getByText("Quad-core 1.3 GHz Cortex-A53")).toBeInTheDocument();
    expect(screen.getByText("2 GB RAM")).toBeInTheDocument();
    expect(screen.getByText("Android 6.0 (Marshmallow)")).toBeInTheDocument();
    expect(screen.getByText("720 x 1280 pixels (~210 ppi pixel density)")).toBeInTheDocument();
    expect(
      screen.getByText("Non-removable Li-Ion 3400 mAh battery (12.92 Wh)"),
    ).toBeInTheDocument();
    expect(screen.getByText("13 MP, autofocus")).toBeInTheDocument();
    expect(screen.getByText("2 MP, 720p")).toBeInTheDocument();
    expect(
      screen.getByText("191.7 x 101 x 9.4 mm (7.55 x 3.98 x 0.37 in)"),
    ).toBeInTheDocument();
    expect(screen.getByText("260 g")).toBeInTheDocument();
  });

  it("shows color swatches and storage options with their first values selected", async () => {
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });

    expect(screen.getByRole("radio", { name: "Black" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "16 GB" })).toBeChecked();
  });

  it("shows the home, products, and current product breadcrumb trail", async () => {
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });

    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(breadcrumb).getByRole("link", { name: "Products" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(breadcrumb).getByText("Iconia Talk S")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("presents product specifications before purchase actions", async () => {
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });

    const specifications = screen.getByRole("heading", {
      name: "Specifications",
    });
    const colorSelector = screen.getByRole("group", { name: "Color" });

    expect(
      specifications.compareDocumentPosition(colorSelector) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("omits the specifications section when optional details are unavailable", async () => {
    server.use(http.get(DETAIL_URL, () => HttpResponse.json({
      id: productDetailFixture.id,
      brand: "Acer",
      model: "Iconia Talk S",
      price: "170",
      options: productDetailFixture.options,
    })));

    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Specifications" }),
    ).not.toBeInTheDocument();
  });

  it("returns to the product listing from the detail page", async () => {
    const user = userEvent.setup();
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(await screen.findByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
  });

  it("posts the selected variant codes to the cart endpoint", async () => {
    const user = userEvent.setup();
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    await user.click(screen.getByRole("radio", { name: "32 GB" }));
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    await waitFor(() => expect(cartPayloads).toEqual([{
      id: productDetailFixture.id,
      colorCode: 1000,
      storageCode: 2001,
    }]));
    expect(requests.filter(({ url }) => url === CART_URL)).toEqual([
      { method: "POST", url: CART_URL },
    ]);
  });

  it("shows the updated cart count after a successful submission", async () => {
    const user = userEvent.setup();
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(await screen.findByText("Added to cart")).toBeInTheDocument();
    expect(
      await screen.findByRole("group", { name: "Cart items: 4" }),
    ).toBeInTheDocument();
    expect(cartStore.getSnapshot().cartCount).toBe(4);
  });

  it("disables the add button while the cart request is pending", async () => {
    const user = userEvent.setup();
    let resolveCartRequest;
    server.use(http.post(CART_URL, () =>
      new Promise((resolve) => {
        resolveCartRequest = resolve;
      }),
    ));
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    const addButton = screen.getByRole("button", { name: "Add to cart" });
    await user.click(addButton);

    expect(addButton).toBeDisabled();
    expect(addButton).toHaveTextContent("Adding");
    await waitFor(() => expect(resolveCartRequest).toBeTypeOf("function"));
    resolveCartRequest(HttpResponse.json({ count: 4 }));
    expect(await screen.findByText("Added to cart")).toBeInTheDocument();
  });

  it("shows an error when adding the product to the cart fails", async () => {
    const user = userEvent.setup();
    server.use(http.post(CART_URL, () => HttpResponse.error()));
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(
      await screen.findByRole("alert", { name: "Cart update failed" }),
    ).toHaveTextContent("We couldn't add this product. Please try again.");
  });

  it("shows a loading state while the product detail request is pending", async () => {
    let resolveProduct;
    server.use(http.get(DETAIL_URL, () =>
      new Promise((resolve) => {
        resolveProduct = resolve;
      }),
    ));
    renderApplication();

    expect(screen.getByRole("status")).toHaveTextContent("Loading product");
    await waitFor(() => expect(resolveProduct).toBeTypeOf("function"));
    resolveProduct(HttpResponse.json(productDetailFixture));
    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
  });

  it("retries when loading the product detail fails", async () => {
    const user = userEvent.setup();
    let attempt = 0;
    server.use(http.get(DETAIL_URL, () => {
      attempt += 1;
      return attempt === 1
        ? HttpResponse.error()
        : HttpResponse.json(productDetailFixture);
    }));
    renderApplication();

    expect(
      await screen.findByText("We couldn't load this product"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expectDetailRequests(2);
  });

  it("shows a not-found state when the API returns a 404", async () => {
    server.use(http.get(DETAIL_URL, () => HttpResponse.json({}, { status: 404 })));
    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Product not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to products" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("uses a valid cached detail without calling the API again", async () => {
    const now = Date.now();
    await db.apiCache.put({
        key: `/product/${productDetailFixture.id}`,
        response: productDetailFixture,
        savedAt: now,
        expiresAt: now + 60_000,
      });

    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expectDetailRequests(0);
  });

  it("shows the saved detail with a stale notice when refresh fails", async () => {
    const now = Date.now();
    await db.apiCache.put({
        key: `/product/${productDetailFixture.id}`,
        response: productDetailFixture,
        savedAt: now - 120_000,
        expiresAt: now - 60_000,
      });
    server.use(http.get(DETAIL_URL, () => HttpResponse.error()));

    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing saved product details",
    );
    expectDetailRequests(1);
  });

  it("does not duplicate a detail request when React Strict Mode replays effects", async () => {
    renderApplication({ strict: true });

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expectDetailRequests(1);
  });
});
