import { describe, it, expect } from "vitest";
import { formatLockoutMessage } from "@/hooks/useAccountLockout";

describe("useAccountLockout", () => {
  describe("formatLockoutMessage", () => {
    it("should return 'less than a minute' for values <= 1", () => {
      expect(formatLockoutMessage(0.5)).toBe("less than a minute");
      expect(formatLockoutMessage(1)).toBe("less than a minute");
    });

    it("should return singular minute for ~1 minute", () => {
      expect(formatLockoutMessage(1.5)).toBe("2 minutes");
    });

    it("should return plural minutes for values > 1", () => {
      expect(formatLockoutMessage(5)).toBe("5 minutes");
      expect(formatLockoutMessage(15)).toBe("15 minutes");
    });

    it("should ceil fractional minutes", () => {
      expect(formatLockoutMessage(2.3)).toBe("3 minutes");
      expect(formatLockoutMessage(4.9)).toBe("5 minutes");
    });
  });
});
