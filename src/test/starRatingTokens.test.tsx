/**
 * Guards that star icons in StarRating and ReviewsList render with the
 * `warning` semantic token classes (fill-warning / text-warning) — not
 * raw palette colors like text-yellow-400.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StarRating } from "@/components/StarRating";
import { ReviewsList } from "@/components/ReviewsList";

function getStars(container: HTMLElement) {
  return Array.from(container.querySelectorAll("svg.lucide-star")) as SVGElement[];
}

const FORBIDDEN = [
  /text-yellow-\d+/,
  /fill-yellow-\d+/,
  /text-amber-\d+/,
  /fill-amber-\d+/,
  /text-orange-\d+/,
  /fill-orange-\d+/,
  /text-\[#[0-9a-fA-F]+\]/,
  /fill-\[#[0-9a-fA-F]+\]/,
];

function expectNoRawColor(el: Element) {
  const cls = el.getAttribute("class") ?? "";
  for (const pattern of FORBIDDEN) {
    expect(cls, `unexpected raw color class in "${cls}"`).not.toMatch(pattern);
  }
}

describe("StarRating semantic tokens", () => {
  it("filled stars use fill-warning and text-warning", () => {
    const { container } = render(<StarRating rating={3} />);
    const stars = getStars(container);
    expect(stars).toHaveLength(5);

    // First 3 stars are filled.
    for (let i = 0; i < 3; i++) {
      const cls = stars[i].getAttribute("class") ?? "";
      expect(cls).toContain("fill-warning");
      expect(cls).toContain("text-warning");
      expectNoRawColor(stars[i]);
    }

    // Remaining stars use the muted token, not raw grey.
    for (let i = 3; i < 5; i++) {
      const cls = stars[i].getAttribute("class") ?? "";
      expect(cls).toContain("text-muted-foreground/30");
      expectNoRawColor(stars[i]);
    }
  });

  it("half-filled stars use fill-warning/50 and text-warning", () => {
    const { container } = render(<StarRating rating={2.5} />);
    const stars = getStars(container);
    const halfStar = stars[2];
    const cls = halfStar.getAttribute("class") ?? "";
    expect(cls).toContain("fill-warning/50");
    expect(cls).toContain("text-warning");
    expectNoRawColor(halfStar);
  });

  it("interactive hover uses hover:text-warning, never a raw hue", () => {
    const { container } = render(
      <StarRating rating={0} interactive onRatingChange={() => {}} />
    );
    for (const star of getStars(container)) {
      const cls = star.getAttribute("class") ?? "";
      expect(cls).toContain("hover:text-warning");
      expectNoRawColor(star);
    }
  });
});

describe("ReviewsList semantic tokens", () => {
  const review = {
    id: "r1",
    rating: 4,
    comment: "Great set!",
    created_at: "2025-01-01T00:00:00.000Z",
    reviewer_name: "Test Venue",
    reviewer_type: "venue" as const,
  };

  it("header star icon uses text-warning", () => {
    const { container } = render(<ReviewsList reviews={[]} />);
    const headerStar = container.querySelector("svg.lucide-star");
    expect(headerStar).not.toBeNull();
    const cls = headerStar!.getAttribute("class") ?? "";
    expect(cls).toContain("text-warning");
    expectNoRawColor(headerStar!);
  });

  it("per-review stars use fill-warning + text-warning and muted for empty", () => {
    const { container } = render(<ReviewsList reviews={[review]} />);
    const stars = getStars(container);
    // 1 header + 5 rating stars
    expect(stars).toHaveLength(6);
    const ratingStars = stars.slice(1);

    for (let i = 0; i < 4; i++) {
      const cls = ratingStars[i].getAttribute("class") ?? "";
      expect(cls).toContain("fill-warning");
      expect(cls).toContain("text-warning");
      expectNoRawColor(ratingStars[i]);
    }

    const emptyStarCls = ratingStars[4].getAttribute("class") ?? "";
    expect(emptyStarCls).toContain("text-muted-foreground/30");
    expectNoRawColor(ratingStars[4]);
  });
});
