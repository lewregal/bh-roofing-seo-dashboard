import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Delta } from "@/components/ui/Delta";

describe("Delta", () => {
  it("shows green for positive change on higher-is-better metric", () => {
    render(<Delta pct={32} lowerIsBetter={false} />);
    const el = screen.getByText(/32/);
    expect(el.className).toContain("text-good");
  });

  it("shows green for negative change on lower-is-better metric (position improved)", () => {
    render(<Delta pct={-8} lowerIsBetter={true} />);
    const el = screen.getByText(/8/);
    expect(el.className).toContain("text-good");
  });

  it("shows red for positive change on lower-is-better metric (position worsened)", () => {
    render(<Delta pct={8} lowerIsBetter={true} />);
    const el = screen.getByText(/8/);
    expect(el.className).toContain("text-bad");
  });
});
