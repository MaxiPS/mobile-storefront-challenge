# Mobile Storefront

> A frontend technical assessment for Nunegal Consulting.

[![Frontend CI](https://github.com/MaxiPS/mobile-storefront-challenge/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/MaxiPS/mobile-storefront-challenge/actions/workflows/ci.yaml)

Mobile Storefront is a responsive React single-page application for browsing mobile devices, viewing technical details, and adding selected variants to a cart. Product data is cached in the browser, and catalog searches run against local IndexedDB data.

## Features

- Browse a responsive product catalog with up to four columns on wide screens.
- Navigate the catalog with numbered pages and previous/next controls.
- Search products by brand or model using local IndexedDB data.
- View product specifications and choose color swatches and storage options.
- Add a selected variant to the cart and share the updated count across routes.
- Show loading, error, empty, no-results, and stale-cache states.

## Technology

| Area | Technology |
| --- | --- |
| Application | React, Vite, and JavaScript |
| Routing | React Router |
| UI components | shadcn/ui and Radix UI |
| Application styling | CSS |
| Product cache | Dexie.js over IndexedDB |
| Shared state | Three in-memory stores with `useSyncExternalStore` |
| Tests | Vitest, React Testing Library, and MSW |
| Code quality | ESLint |

Tailwind CSS is retained for the shadcn/ui setup; the application's own layout and styles are written in CSS.

## Getting started

### Requirements

- Node.js 20.19 or later, or 22.12 or later (the CI workflow uses Node.js 24).
- npm.

### Install and run

```bash
npm ci
npm run START
```

Vite prints the local development URL in the terminal.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run START` | Start the Vite development server. |
| `npm run BUILD` | Create a production build. |
| `npm run TEST` | Run the test suite once. |
| `npm run TEST:WATCH` | Run tests in watch mode. |
| `npm run LINT` | Check JavaScript and JSX with ESLint. |

## Routes

| Path | View |
| --- | --- |
| `/` | Product listing and local search. |
| `/products/:id` | Product details and cart actions. |
| Any other path | Not-found page. |

## Architecture and data flow

```mermaid
flowchart LR
  Pages[Product pages] --> Stores[Cart, list, and current product stores]
  Stores --> Cache[Cache service]
  Cache --> API[Assessment API]
  Cache --> DB[(IndexedDB via Dexie)]
  Search[Catalog search] --> Repository[Local cache search]
  Repository --> DB
  Cart[Cart actions] --> API
  API --> Stores
```

### Catalog and local search

The API service encapsulates HTTP requests. Dexie keeps product list and detail responses in the single `apiCache` table for one hour. When the list cache is missing or expired, the app requests fresh data and updates IndexedDB. If refresh fails after expiration, the saved response remains available and the page marks it as stale.

The list store calls the local product repository, which reads the cached list from IndexedDB and filters it by brand and model. Changing the search term does not call the API.

### Cart state

The cart API receives `{ id, colorCode, storageCode }`. Its returned `count` updates the in-memory cart store. The product list and current product have separate in-memory stores. React components subscribe to each store's stable snapshots through `useSyncExternalStore`. The cart count resets on page reload.

### UI and styling

The application uses editable shadcn/ui components with CSS for its own layout, responsive breakpoints, and visual tokens. Pages compose the UI, API, storage, and store modules; they do not access `fetch` or Dexie directly.

The storefront's visual refinement follows the supplied product design while preserving the assessment's SPA behavior. The Impeccable design workflow guided a focused review of hierarchy, spacing, product imagery, responsive catalog cards, and product variant controls. Impeccable is a design aid and is not a runtime dependency.

## API and fixtures

The application uses the assessment service at `https://itx-frontend-test.onrender.com/api`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/product` | Load the product catalog. |
| `GET` | `/product/:id` | Load product details and variant options. |
| `POST` | `/cart` | Add a product variant and receive the cart count. |

Representative GET responses are stored in `tests/fixtures/`. API contract and page integration tests use MSW to intercept HTTP requests at the expected endpoints. Cache policy tests inject request functions to isolate expiration and fallback behavior. The test suite and CI do not depend on the live API. The API's detail response uses the field names `dimentions` and `secondaryCmera`.

## Testing and quality

Functional work follows Red–Green–Refactor. Tests cover API behavior with mocked responses, local persistence with fake IndexedDB, and observable UI behavior with React Testing Library. The CI workflow runs tests, a production build, and ESLint on pull requests targeting `main`.

Run the same checks locally:

```bash
npm run TEST
npm run BUILD
npm run LINT
```

## Known limitations

- Uncached catalog and detail requests, product images, and cart updates depend on the assessment service being available.
- IndexedDB is local to the browser and site origin. Clearing browser site data removes the product cache.
- If an API refresh fails, the app can show saved catalog or detail data as stale; it cannot refresh while the service is unavailable.
- Automated tests mock the cart endpoint. The live cart endpoint has not been manually called because it changes remote cart data.

## Project conventions

Source code, comments, and commit messages are written in English. Keep application behavior in focused modules and cover each new behavior with tests before implementation.
