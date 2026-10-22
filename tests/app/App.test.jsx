import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/app/App.jsx";

describe("App", () => {
  it("renders the storefront scaffold", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Mobile Storefront" }),
    ).toBeInTheDocument();
  });
});
