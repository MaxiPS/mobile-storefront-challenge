import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.jsx";

describe("BreadcrumbPage", () => {
  it("marks the current page without exposing it as a link", () => {
    render(<BreadcrumbPage>Product details</BreadcrumbPage>);

    const currentPage = screen.getByText("Product details");

    expect(currentPage.tagName).toBe("SPAN");
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(currentPage).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
