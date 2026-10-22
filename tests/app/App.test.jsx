import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/app/App.jsx";
import { appStore } from "@/store/appStore.js";

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
