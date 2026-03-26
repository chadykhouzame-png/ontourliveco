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

    it("should handle string errors by sanitizing the message", () => {
      const result = sanitizeError("String error message");
      expect(result.userMessage).toBe("String error message");
      expect(result.code).toBe("STRING_ERROR");
    });

    it("should handle null/undefined errors", () => {
      const resultNull = sanitizeError(null);
      const resultUndefined = sanitizeError(undefined);
      expect(resultNull.userMessage).toBe("An unexpected error occurred. Please try again.");
      expect(resultUndefined.userMessage).toBe("An unexpected error occurred. Please try again.");
    });

    it("should detect network errors from TypeError with fetch message", () => {
      const error = new TypeError("Failed to fetch");
      const result = sanitizeError(error);
      expect(result.code).toBe("NETWORK_ERROR");
      expect(result.userMessage).toContain("connect");
    });

    it("should handle generic errors with default code", () => {
      const error = new Error("Request timeout");
      const result = sanitizeError(error);
      expect(result.code).toBe("ERROR");
      expect(result.isRetryable).toBe(false);
    });
  });

  describe("isRetryableError", () => {
    it("should return true for TypeError network errors", () => {
      const error = new TypeError("Failed to fetch");
      expect(isRetryableError(error)).toBe(true);
    });

    it("should return false for plain Error with timeout message", () => {
      const error = new Error("timeout exceeded");
      expect(isRetryableError(error)).toBe(false);
    });

    it("should return true for PGRST301 (session expired, retryable)", () => {
      const error = { code: "PGRST301", message: "JWT expired" };
      expect(isRetryableError(error)).toBe(true);
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
