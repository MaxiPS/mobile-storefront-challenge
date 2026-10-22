# Mobile Storefront

> A frontend technical assessment for Nunegal Consulting.

Mobile Storefront is a React single-page application for browsing mobile
products, viewing product details, and adding items to a cart. The product
listing is implemented with local search backed by Dexie and IndexedDB.

## Features

- Browse responsive product cards with a maximum of four columns on wide screens.
- Search product brands and models from the local IndexedDB database.
- Revalidate the product list through the API only when the one-hour cache is
  missing or expired; typing in the search field does not make API requests.
- Keep the shared cart count hydrated from and persisted to IndexedDB.
- Show loading, error, empty, no-results, and stale-cache states.

## At a glance

| Area | Choice |
| --- | --- |
| Application | React, Vite, and JavaScript |
| UI components | shadcn/ui |
| Application styles | CSS |
| Local persistence | Dexie.js over IndexedDB |
| Tests | Vitest and React Testing Library |
| Code quality | ESLint |

Tailwind CSS is retained as an internal dependency required by shadcn/ui. The
application's own layout and styles use CSS.

## Getting started

### Requirements

- Node.js 24 or later
- npm

### Install and run

```bash
npm ci
npm run START
```

Vite prints the local development URL in the terminal.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run START` | Start the Vite development server |
| `npm run BUILD` | Create a production build |
| `npm run TEST` | Run the test suite once |
| `npm run TEST:WATCH` | Run tests in watch mode |
| `npm run LINT` | Check JavaScript and JSX with ESLint |

## Design and architecture

- shadcn/ui components are added to the repository and can be adjusted in place.
- Dexie caches product list and detail GET responses for one hour and persists
  the cart count in IndexedDB.
- If an API refresh fails after a cache entry expires, the cache service returns
  the locally stored response with `isStale: true` so the view can identify it.
- The product listing reads products through the cache service. Its search field
  calls the product repository, which matches normalized brand and model fields
  in Dexie without calling the API.
- `appStore` exposes stable immutable snapshots through `useSyncExternalStore`.
- Functional work follows Red–Green–Refactor with mocked API responses and
  fixtures; automated tests do not depend on the live service.
- Source code, comments, and commit messages are written in English.

## API contract and fixtures

The API base URL is `https://itx-frontend-test.onrender.com/api`. A manual
inspection on 2026-10-22 observed the following responses:

- `GET /product` returns an array of products with `id`, `brand`, `model`,
  `price`, and `imgUrl`. All observed values are strings; `price` can be an
  empty string.
- `GET /product/:id` returns the same base fields plus technical specifications.
  Variant choices are in `options.colors` and `options.storages`, each with a
  numeric `code` and string `name`. The API also returns the field names
  `dimentions` and `secondaryCmera` as spelled.
- `POST /cart` is implemented with the `{ id, colorCode, storageCode }` payload.
  Its response is expected to include `count` as described in the assessment;
  it was not called against the live service to avoid changing remote cart data.

Small samples from the observed GET responses are stored in
`tests/fixtures/products.json` and `tests/fixtures/product-detail.json`. The
automated `productsApi` tests mock `fetch`, including the cart response, and do
not make requests to the live API.

The application foundation, API client, client-side routes, Dexie cache, cart
store, and responsive product listing are implemented. The product detail
experience and add-to-cart flow remain subsequent implementation milestones.
