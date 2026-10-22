# Mobile Storefront

> A frontend technical assessment for Nunegal Consulting.

Mobile Storefront is a React single-page application foundation for browsing
mobile products, viewing product details, and adding items to a cart.

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
- Product data and the cart count will persist locally through Dexie.
- Product search will read from the local database and will not call the API as
  the search term changes.
- Functional work follows Red–Green–Refactor with mocked API responses and
  fixtures; automated tests do not depend on the live service.
- Source code, comments, and commit messages are written in English.

This scaffold provides the runnable application foundation and a smoke test.
The product list, detail page, local cache, and cart behavior are subsequent
implementation milestones.
