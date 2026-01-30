import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  describe("cn (classnames utility)", () => {
    it("should merge class names", () => {
      const result = cn("class1", "class2");
      expect(result).toBe("class1 class2");
    });

    it("should handle conditional classes", () => {
      const result = cn("base", true && "included", false && "excluded");
      expect(result).toContain("base");
      expect(result).toContain("included");
      expect(result).not.toContain("excluded");
    });

    it("should handle undefined and null values", () => {
      const result = cn("base", undefined, null, "end");
      expect(result).toBe("base end");
    });

    it("should merge tailwind classes correctly", () => {
      // Later classes should override earlier ones for the same property
      const result = cn("px-2 py-1", "px-4");
      expect(result).toContain("px-4");
      expect(result).toContain("py-1");
    });

    it("should handle empty input", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should handle array of classes", () => {
      const result = cn(["class1", "class2"]);
      expect(result).toContain("class1");
      expect(result).toContain("class2");
    });
  });
});
