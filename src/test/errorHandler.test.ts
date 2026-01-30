import { describe, it, expect } from "vitest";
import { 
  sanitizeError, 
  isRetryableError, 
  getRetryConfigForError 
} from "@/lib/errorHandler";

describe("errorHandler", () => {
  describe("sanitizeError", () => {
    it("should return user-friendly message for unknown errors", () => {
      const result = sanitizeError(new Error("Some internal error"));
      expect(result.userMessage).toBeDefined();
      expect(result.code).toBeDefined();
    });

    it("should handle string errors", () => {
      const result = sanitizeError("String error message");
      expect(result.userMessage).toBe("An unexpected error occurred. Please try again.");
    });

    it("should handle null/undefined errors", () => {
      const resultNull = sanitizeError(null);
      const resultUndefined = sanitizeError(undefined);
      expect(resultNull.userMessage).toBe("An unexpected error occurred. Please try again.");
      expect(resultUndefined.userMessage).toBe("An unexpected error occurred. Please try again.");
    });

    it("should detect network errors", () => {
      const error = new Error("Failed to fetch");
      const result = sanitizeError(error);
      expect(result.code).toBe("NETWORK_ERROR");
      expect(result.userMessage).toContain("network");
    });

    it("should detect timeout errors", () => {
      const error = new Error("Request timeout");
      const result = sanitizeError(error);
      expect(result.code).toBe("TIMEOUT_ERROR");
    });
  });

  describe("isRetryableError", () => {
    it("should return true for network errors", () => {
      const error = new Error("Failed to fetch");
      expect(isRetryableError(error)).toBe(true);
    });

    it("should return true for timeout errors", () => {
      const error = new Error("timeout exceeded");
      expect(isRetryableError(error)).toBe(true);
    });

    it("should return false for auth errors", () => {
      const error = { code: "PGRST301" }; // Auth error
      expect(isRetryableError(error)).toBe(false);
    });

    it("should return false for validation errors", () => {
      const error = new Error("Invalid email format");
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe("getRetryConfigForError", () => {
    it("should return config for rate limit errors", () => {
      const error = { code: "429", message: "Too many requests" };
      const config = getRetryConfigForError(error);
      expect(config.maxRetries).toBeGreaterThan(0);
      expect(config.baseDelayMs).toBeGreaterThan(0);
    });

    it("should return default config for unknown errors", () => {
      const error = new Error("Unknown error");
      const config = getRetryConfigForError(error);
      expect(config).toBeDefined();
      expect(config.maxRetries).toBeDefined();
    });
  });
});
