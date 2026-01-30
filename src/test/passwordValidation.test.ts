import { describe, it, expect } from "vitest";
import { 
  passwordSchema,
  checkPasswordStrength, 
  getStrengthLabel,
  PASSWORD_MIN_LENGTH 
} from "@/lib/passwordValidation";

describe("passwordValidation", () => {
  describe("passwordSchema", () => {
    it("should reject passwords shorter than minimum length", () => {
      const result = passwordSchema.safeParse("Abc1!");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes("at least"))).toBe(true);
      }
    });

    it("should reject passwords without uppercase", () => {
      const result = passwordSchema.safeParse("abcdefgh1!");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes("uppercase"))).toBe(true);
      }
    });

    it("should reject passwords without lowercase", () => {
      const result = passwordSchema.safeParse("ABCDEFGH1!");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes("lowercase"))).toBe(true);
      }
    });

    it("should reject passwords without numbers", () => {
      const result = passwordSchema.safeParse("Abcdefgh!");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes("number"))).toBe(true);
      }
    });

    it("should reject passwords without special characters", () => {
      const result = passwordSchema.safeParse("Abcdefgh1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes("special"))).toBe(true);
      }
    });

    it("should accept valid passwords", () => {
      const result = passwordSchema.safeParse("SecurePass123!");
      expect(result.success).toBe(true);
    });
  });

  describe("checkPasswordStrength", () => {
    it("should return all false for empty password", () => {
      const result = checkPasswordStrength("");
      expect(result.length).toBe(false);
      expect(result.uppercase).toBe(false);
      expect(result.lowercase).toBe(false);
      expect(result.number).toBe(false);
      expect(result.special).toBe(false);
      expect(result.score).toBe(0);
    });

    it("should detect uppercase letters", () => {
      const result = checkPasswordStrength("ABC");
      expect(result.uppercase).toBe(true);
      expect(result.lowercase).toBe(false);
    });

    it("should detect lowercase letters", () => {
      const result = checkPasswordStrength("abc");
      expect(result.lowercase).toBe(true);
      expect(result.uppercase).toBe(false);
    });

    it("should detect numbers", () => {
      const result = checkPasswordStrength("123");
      expect(result.number).toBe(true);
    });

    it("should detect special characters", () => {
      const result = checkPasswordStrength("!@#");
      expect(result.special).toBe(true);
    });

    it("should calculate correct score for strong password", () => {
      const result = checkPasswordStrength("SecurePass123!");
      expect(result.length).toBe(true);
      expect(result.uppercase).toBe(true);
      expect(result.lowercase).toBe(true);
      expect(result.number).toBe(true);
      expect(result.special).toBe(true);
      expect(result.score).toBe(5);
    });
  });

  describe("getStrengthLabel", () => {
    it("should return Very Weak for score <= 1", () => {
      expect(getStrengthLabel(0).label).toBe("Very Weak");
      expect(getStrengthLabel(1).label).toBe("Very Weak");
    });

    it("should return Weak for score 2", () => {
      expect(getStrengthLabel(2).label).toBe("Weak");
    });

    it("should return Fair for score 3", () => {
      expect(getStrengthLabel(3).label).toBe("Fair");
    });

    it("should return Good for score 4", () => {
      expect(getStrengthLabel(4).label).toBe("Good");
    });

    it("should return Strong for score 5", () => {
      expect(getStrengthLabel(5).label).toBe("Strong");
    });
  });

  describe("PASSWORD_MIN_LENGTH", () => {
    it("should be 8 characters", () => {
      expect(PASSWORD_MIN_LENGTH).toBe(8);
    });
  });
});
